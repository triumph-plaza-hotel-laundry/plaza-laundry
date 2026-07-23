/**
 * Shared OneSignal delivery pipeline for Supabase Edge Functions.
 * Never treats HTTP 200 alone as success — inspects recipients/errors.
 */

export type DeliveryAttemptResult = {
  ok: boolean;
  httpStatus: number;
  recipients: number | null;
  onesignalNotificationId: string | null;
  errorMessage: string | null;
  responseBody: Record<string, unknown> | null;
  invalidPlayerIds: string[];
  attemptNumber: number;
};

export type SmartDeliveryResult = {
  ok: boolean;
  attempts: DeliveryAttemptResult[];
  final: DeliveryAttemptResult;
  invalidPlayerIds: string[];
};

const DEFAULT_BACKOFF_MS = [1_000, 5_000, 15_000] as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function extractInvalidIds(body: Record<string, unknown> | null): string[] {
  if (!body) {
    return [];
  }

  const ids = new Set<string>();
  const candidates = [
    body.invalid_player_ids,
    body.invalid_subscription_ids,
    body.errors,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      for (const entry of candidate) {
        if (typeof entry === 'string' && entry.trim()) {
          ids.add(entry.trim());
        } else if (entry && typeof entry === 'object') {
          const record = entry as Record<string, unknown>;
          for (const key of ['id', 'player_id', 'subscription_id']) {
            const value = record[key];
            if (typeof value === 'string' && value.trim()) {
              ids.add(value.trim());
            }
          }
        }
      }
    } else if (candidate && typeof candidate === 'object') {
      const record = candidate as Record<string, unknown>;
      for (const value of Object.values(record)) {
        if (typeof value === 'string' && /subscription|player|invalid/i.test(value)) {
          // Keep textual errors; player ids collected elsewhere.
        }
      }
    }
  }

  return Array.from(ids);
}

function summarizeError(
  httpStatus: number,
  body: Record<string, unknown> | null,
  rawText: string,
): string | null {
  if (body?.errors) {
    try {
      return JSON.stringify(body.errors).slice(0, 500);
    } catch {
      // fall through
    }
  }
  if (typeof body?.error === 'string') {
    return body.error;
  }
  if (rawText.trim()) {
    return rawText.trim().slice(0, 500);
  }
  if (httpStatus >= 400) {
    return `HTTP ${httpStatus}`;
  }
  return null;
}

async function sendOnce(
  appId: string,
  restKey: string,
  playerId: string,
  title: string,
  body: string,
  attemptNumber: number,
  idempotencyKey?: string,
): Promise<DeliveryAttemptResult> {
  const payload: Record<string, unknown> = {
    app_id: appId,
    include_subscription_ids: [playerId],
    headings: { en: title },
    contents: { en: body },
  };

  if (idempotencyKey) {
    payload.external_id = idempotencyKey;
  }

  const response = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${restKey}`,
    },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  let parsed: unknown = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = null;
  }

  const responseBody = asRecord(parsed);
  const recipientsRaw = responseBody?.recipients;
  const recipients =
    typeof recipientsRaw === 'number'
      ? recipientsRaw
      : recipientsRaw == null
        ? null
        : Number(recipientsRaw);

  const onesignalNotificationId =
    typeof responseBody?.id === 'string' ? responseBody.id : null;

  const invalidPlayerIds = extractInvalidIds(responseBody);
  if (
    response.ok &&
    recipients === 0 &&
    !invalidPlayerIds.includes(playerId)
  ) {
    invalidPlayerIds.push(playerId);
  }

  const errorMessage = summarizeError(response.status, responseBody, rawText);

  // Success rules:
  // - HTTP ok
  // - not explicitly zero recipients
  // - subscription not listed as invalid
  // - OneSignal returned a notification id OR a positive recipients count
  const hasPositiveRecipients =
    typeof recipients === 'number' && Number.isFinite(recipients) && recipients > 0;
  const hasNotificationId = Boolean(onesignalNotificationId);
  const ok =
    response.ok &&
    recipients !== 0 &&
    !invalidPlayerIds.includes(playerId) &&
    (hasNotificationId || hasPositiveRecipients);

  return {
    ok,
    httpStatus: response.status,
    recipients: Number.isFinite(recipients as number) ? (recipients as number) : null,
    onesignalNotificationId,
    errorMessage: ok ? null : errorMessage || 'Delivery failed',
    responseBody,
    invalidPlayerIds,
    attemptNumber,
  };
}

/**
 * Send to a single subscription with retries and response inspection.
 */
export async function sendToSubscriptionId(options: {
  appId: string;
  restKey: string;
  playerId: string;
  title: string;
  body: string;
  maxAttempts?: number;
  backoffMs?: readonly number[];
  idempotencyKey?: string;
}): Promise<SmartDeliveryResult> {
  const maxAttempts = options.maxAttempts ?? 3;
  const backoff = options.backoffMs ?? DEFAULT_BACKOFF_MS;
  const attempts: DeliveryAttemptResult[] = [];
  const invalid = new Set<string>();

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let result: DeliveryAttemptResult;
    try {
      result = await sendOnce(
        options.appId,
        options.restKey,
        options.playerId,
        options.title,
        options.body,
        attempt,
        options.idempotencyKey
          ? `${options.idempotencyKey}:a${attempt}`
          : undefined,
      );
    } catch (error) {
      result = {
        ok: false,
        httpStatus: 0,
        recipients: null,
        onesignalNotificationId: null,
        errorMessage:
          error instanceof Error ? error.message : 'Network error sending push',
        responseBody: null,
        invalidPlayerIds: [],
        attemptNumber: attempt,
      };
    }

    attempts.push(result);
    for (const id of result.invalidPlayerIds) {
      invalid.add(id);
    }

    if (result.ok) {
      return {
        ok: true,
        attempts,
        final: result,
        invalidPlayerIds: Array.from(invalid),
      };
    }

    // Do not retry permanent invalid subscription ids.
    if (invalid.has(options.playerId)) {
      break;
    }

    // Do not retry clear 4xx client errors except 429.
    if (
      result.httpStatus >= 400 &&
      result.httpStatus < 500 &&
      result.httpStatus !== 429
    ) {
      break;
    }

    if (attempt < maxAttempts) {
      const delay = backoff[Math.min(attempt - 1, backoff.length - 1)] ?? 15_000;
      await sleep(delay);
    }
  }

  return {
    ok: false,
    attempts,
    final: attempts[attempts.length - 1]!,
    invalidPlayerIds: Array.from(invalid),
  };
}

/** Legacy-compatible single-shot wrapper used as fallback. */
export async function sendOneSignalNotificationLegacy(
  appId: string,
  restKey: string,
  playerId: string,
  title: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await sendOnce(
      appId,
      restKey,
      playerId,
      title,
      body,
      1,
    );
    return result.ok
      ? { ok: true }
      : { ok: false, error: result.errorMessage ?? 'Send failed' };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Send failed',
    };
  }
}

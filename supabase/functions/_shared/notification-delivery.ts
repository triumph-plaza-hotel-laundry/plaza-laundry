/**
 * Shared OneSignal delivery pipeline for Supabase Edge Functions.
 * Never treats HTTP 200 alone as success — inspects recipients/errors.
 *
 * OneSignal requires `idempotency_key` to be an RFC 9562 UUID (v4).
 * Never send concatenated strings (type/date/employee/admin/attempt).
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

/** UUID v4 (RFC 4122 / 9562 variant). */
const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function isUuidV4(value: string): boolean {
  return UUID_V4_RE.test(value.trim());
}

/**
 * Returns a valid UUID v4 for OneSignal idempotency_key.
 * If a candidate is provided and already valid, reuse it (safe retries).
 * Otherwise generate a fresh crypto.randomUUID().
 */
export function ensureUuidV4IdempotencyKey(candidate?: string | null): string {
  const trimmed = typeof candidate === 'string' ? candidate.trim() : '';
  if (trimmed && isUuidV4(trimmed)) {
    return trimmed;
  }
  return crypto.randomUUID();
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
  idempotencyKey: string,
): Promise<DeliveryAttemptResult> {
  const key = ensureUuidV4IdempotencyKey(idempotencyKey);

  const payload: Record<string, unknown> = {
    app_id: appId,
    include_subscription_ids: [playerId],
    headings: { en: title },
    contents: { en: body },
    // OneSignal requires a UUID v4. Prefer idempotency_key (external_id alias is legacy).
    idempotency_key: key,
  };

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
 * One UUID v4 idempotency_key is generated per logical send and reused on retries.
 */
export async function sendToSubscriptionId(options: {
  appId: string;
  restKey: string;
  playerId: string;
  title: string;
  body: string;
  maxAttempts?: number;
  backoffMs?: readonly number[];
  /** Optional UUID v4. Non-UUID values are ignored and replaced. */
  idempotencyKey?: string;
}): Promise<SmartDeliveryResult> {
  const maxAttempts = options.maxAttempts ?? 3;
  const backoff = options.backoffMs ?? DEFAULT_BACKOFF_MS;
  const attempts: DeliveryAttemptResult[] = [];
  const invalid = new Set<string>();

  // One key per logical notification — reused across retries (OneSignal idempotency).
  const idempotencyKey = ensureUuidV4IdempotencyKey(options.idempotencyKey);

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
        idempotencyKey,
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

    if (invalid.has(options.playerId)) {
      break;
    }

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
      crypto.randomUUID(),
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

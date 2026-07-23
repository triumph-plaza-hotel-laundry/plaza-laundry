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
const ONESIGNAL_NOTIFICATIONS_URL = 'https://api.onesignal.com/notifications';

/** UUID v4 (RFC 4122 / 9562 variant). */
const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Any UUID shape (OneSignal subscription / player / notification ids). */
const UUID_ANY_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function maskSecret(value: string | null | undefined, keep = 6): string {
  if (!value) {
    return '(missing)';
  }
  const trimmed = value.trim();
  if (trimmed.length <= keep) {
    return `${trimmed.slice(0, 2)}…`;
  }
  return `${trimmed.slice(0, keep)}…(len=${trimmed.length})`;
}

export function isUuidV4(value: string): boolean {
  return UUID_V4_RE.test(value.trim());
}

function isUuidLike(value: string): boolean {
  return UUID_ANY_RE.test(value.trim());
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
    if (!Array.isArray(candidate)) {
      continue;
    }
    for (const entry of candidate) {
      if (typeof entry === 'string' && isUuidLike(entry)) {
        ids.add(entry.trim());
        continue;
      }
      if (entry && typeof entry === 'object') {
        const record = entry as Record<string, unknown>;
        for (const key of ['id', 'player_id', 'subscription_id']) {
          const value = record[key];
          if (typeof value === 'string' && isUuidLike(value)) {
            ids.add(value.trim());
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
  subscriptionId: string,
  title: string,
  body: string,
  attemptNumber: number,
  idempotencyKey: string,
): Promise<DeliveryAttemptResult> {
  const key = ensureUuidV4IdempotencyKey(idempotencyKey);

  // Current OneSignal Create Notification API:
  // - include_subscription_ids targets Web/mobile subscription UUIDs
  // - Authorization: Key <REST API Key>
  // - target_channel: push (explicit; avoids channel ambiguity)
  // - idempotency_key must be UUID v4
  const payload: Record<string, unknown> = {
    app_id: appId,
    include_subscription_ids: [subscriptionId],
    target_channel: 'push',
    headings: { en: title },
    contents: { en: body },
    idempotency_key: key,
  };

  console.log('[onesignal-delivery] preparing payload', {
    attemptNumber,
    endpoint: ONESIGNAL_NOTIFICATIONS_URL,
    appIdPrefix: maskSecret(appId, 8),
    restKeyPrefix: maskSecret(restKey, 10),
    authScheme: 'Key',
    subscriptionId,
    idempotencyKey: key,
    titleLen: title.length,
    bodyLen: body.length,
    targeting: 'include_subscription_ids',
    target_channel: 'push',
  });

  let response: Response;
  try {
    console.log('[onesignal-delivery] sending fetch request…');
    response = await fetch(ONESIGNAL_NOTIFICATIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${restKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('[onesignal-delivery] fetch threw', error);
    throw error;
  }

  const rawText = await response.text();
  console.log('[onesignal-delivery] received response', {
    attemptNumber,
    httpStatus: response.status,
    ok: response.ok,
    rawPreview: rawText.slice(0, 500),
  });

  let parsed: unknown = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
    console.log('[onesignal-delivery] parsed response JSON', parsed);
  } catch (parseError) {
    console.error('[onesignal-delivery] response JSON parse failed', parseError);
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
    !invalidPlayerIds.includes(subscriptionId)
  ) {
    console.warn(
      '[onesignal-delivery] recipients=0 — treating subscription as invalid',
      subscriptionId,
    );
    invalidPlayerIds.push(subscriptionId);
  }

  const errorMessage = summarizeError(response.status, responseBody, rawText);

  // OneSignal Create Message v2 often returns { id, external_id } with no
  // recipients field. Treat notification id + HTTP ok as success unless
  // recipients is explicitly 0 or the subscription is listed invalid.
  const hasPositiveRecipients =
    typeof recipients === 'number' && Number.isFinite(recipients) && recipients > 0;
  const hasNotificationId = Boolean(onesignalNotificationId);
  const ok =
    response.ok &&
    recipients !== 0 &&
    !invalidPlayerIds.includes(subscriptionId) &&
    (hasNotificationId || hasPositiveRecipients);

  console.log('[onesignal-delivery] attempt result', {
    attemptNumber,
    ok,
    httpStatus: response.status,
    recipients,
    onesignalNotificationId,
    invalidPlayerIds,
    errorMessage: ok ? null : errorMessage,
  });

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
  const subscriptionId = options.playerId?.trim() ?? '';

  console.log('[onesignal-delivery] sendToSubscriptionId start', {
    subscriptionId,
    hasSubscriptionId: Boolean(subscriptionId),
    appIdPrefix: maskSecret(options.appId, 8),
    restKeyPrefix: maskSecret(options.restKey, 10),
    maxAttempts,
  });

  if (!subscriptionId) {
    const failed: DeliveryAttemptResult = {
      ok: false,
      httpStatus: 0,
      recipients: null,
      onesignalNotificationId: null,
      errorMessage: 'Missing OneSignal subscription_id',
      responseBody: null,
      invalidPlayerIds: [],
      attemptNumber: 1,
    };
    console.error('[onesignal-delivery] abort — empty subscription_id');
    return {
      ok: false,
      attempts: [failed],
      final: failed,
      invalidPlayerIds: [],
    };
  }

  if (!options.appId?.trim() || !options.restKey?.trim()) {
    const failed: DeliveryAttemptResult = {
      ok: false,
      httpStatus: 0,
      recipients: null,
      onesignalNotificationId: null,
      errorMessage: 'Missing OneSignal App ID or REST API Key',
      responseBody: null,
      invalidPlayerIds: [],
      attemptNumber: 1,
    };
    console.error('[onesignal-delivery] abort — missing app id or rest key');
    return {
      ok: false,
      attempts: [failed],
      final: failed,
      invalidPlayerIds: [],
    };
  }

  // One key per logical notification — reused across retries (OneSignal idempotency).
  const idempotencyKey = ensureUuidV4IdempotencyKey(options.idempotencyKey);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let result: DeliveryAttemptResult;
    try {
      result = await sendOnce(
        options.appId,
        options.restKey,
        subscriptionId,
        options.title,
        options.body,
        attempt,
        idempotencyKey,
      );
    } catch (error) {
      console.error('[onesignal-delivery] sendOnce catch', error);
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
      console.log('[onesignal-delivery] send succeeded', {
        attempt,
        onesignalNotificationId: result.onesignalNotificationId,
        recipients: result.recipients,
      });
      return {
        ok: true,
        attempts,
        final: result,
        invalidPlayerIds: Array.from(invalid),
      };
    }

    if (invalid.has(subscriptionId)) {
      console.warn('[onesignal-delivery] stopping retries — subscription invalid');
      break;
    }

    if (
      result.httpStatus >= 400 &&
      result.httpStatus < 500 &&
      result.httpStatus !== 429
    ) {
      console.warn('[onesignal-delivery] stopping retries — client error', result.httpStatus);
      break;
    }

    if (attempt < maxAttempts) {
      const delay = backoff[Math.min(attempt - 1, backoff.length - 1)] ?? 15_000;
      console.log('[onesignal-delivery] backing off before retry', { attempt, delay });
      await sleep(delay);
    }
  }

  console.error('[onesignal-delivery] send exhausted retries', {
    subscriptionId,
    attempts: attempts.length,
    finalError: attempts[attempts.length - 1]?.errorMessage,
  });

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
    console.log('[onesignal-delivery] legacy fallback send', {
      subscriptionId: playerId,
    });
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
    console.error('[onesignal-delivery] legacy fallback catch', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Send failed',
    };
  }
}

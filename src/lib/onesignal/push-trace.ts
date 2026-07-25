/**
 * Client + SW push pipeline tracer (OS notification diagnosis).
 * In-app viewer: /employee-device-pairing → “Push client logs”.
 */

const PREFIX = '[push-trace:client]';
const DB_NAME = 'tpl-push-trace';
const STORE = 'events';
const MAX_MEMORY = 300;

export type PushTraceEntry = {
  stage: string;
  detail?: unknown;
  at: string;
  swScript?: string | null;
  source?: string;
};

/** Ordered stages used to locate where the OS tray path stops. */
export const PUSH_PIPELINE_STAGES = [
  'push-received',
  'payload-parsed',
  'showNotification-called',
  'showNotification-resolved',
  'notificationclick',
  'foregroundWillDisplay',
] as const;

export type PushPipelineStage = (typeof PUSH_PIPELINE_STAGES)[number];

export type PushPipelineAnalysis = {
  entries: PushTraceEntry[];
  seen: Record<string, number>;
  firstMissing: PushPipelineStage | null;
  stoppedAt: string | null;
  note: string;
  hasThrow: boolean;
  lastThrow: PushTraceEntry | null;
};

const memory: PushTraceEntry[] = [];
let wired = false;
const liveListeners = new Set<(entry: PushTraceEntry) => void>();

function pushMemory(entry: PushTraceEntry) {
  memory.push(entry);
  if (memory.length > MAX_MEMORY) {
    memory.splice(0, memory.length - MAX_MEMORY);
  }
  for (const listener of liveListeners) {
    try {
      listener(entry);
    } catch {
      /* ignore */
    }
  }
}

function openTraceDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onerror = () => resolve(null);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
    } catch {
      resolve(null);
    }
  });
}

async function persistClientEntry(entry: PushTraceEntry): Promise<void> {
  const db = await openTraceDb();
  if (!db) return;
  try {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.objectStore(STORE).add(entry);
      } catch {
        resolve();
      }
    });
  } finally {
    try {
      db.close();
    } catch {
      /* ignore */
    }
  }
}

export function pushTrace(stage: string, detail?: unknown) {
  const entry: PushTraceEntry = {
    stage,
    detail: detail ?? null,
    at: new Date().toISOString(),
    source: 'client',
  };
  pushMemory(entry);
  console.info(PREFIX, stage, detail ?? '');
  void persistClientEntry(entry);
}

export function subscribePushTraceLive(
  listener: (entry: PushTraceEntry) => void,
): () => void {
  liveListeners.add(listener);
  return () => {
    liveListeners.delete(listener);
  };
}

export async function readPushTraceEntries(): Promise<PushTraceEntry[]> {
  const db = await openTraceDb();
  const fromDb: PushTraceEntry[] = [];
  if (db) {
    try {
      const rows = await new Promise<PushTraceEntry[]>((resolve) => {
        try {
          if (!db.objectStoreNames.contains(STORE)) {
            resolve([]);
            return;
          }
          const tx = db.transaction(STORE, 'readonly');
          const getAll = tx.objectStore(STORE).getAll();
          getAll.onsuccess = () => {
            resolve((getAll.result as PushTraceEntry[]) ?? []);
          };
          getAll.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      });
      fromDb.push(...rows);
    } finally {
      try {
        db.close();
      } catch {
        /* ignore */
      }
    }
  }

  const merged = [...fromDb, ...memory].sort((a, b) =>
    a.at.localeCompare(b.at),
  );

  // De-dupe identical stage+at+source triples from SW broadcast + IDB.
  const seen = new Set<string>();
  const unique: PushTraceEntry[] = [];
  for (const entry of merged) {
    const key = `${entry.at}|${entry.stage}|${entry.source ?? ''}|${JSON.stringify(entry.detail ?? null)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(entry);
  }
  return unique;
}

export function analyzePushPipeline(
  entries: PushTraceEntry[],
): PushPipelineAnalysis {
  const seen: Record<string, number> = {};
  for (const entry of entries) {
    seen[entry.stage] = (seen[entry.stage] ?? 0) + 1;
  }

  const throws = entries.filter((e) => e.stage === 'showNotification-threw');
  const hasThrow = throws.length > 0;

  let firstMissing: PushPipelineStage | null = null;
  for (const stage of PUSH_PIPELINE_STAGES) {
    // foregroundWillDisplay only applies when a page is visible — skip as "missing stop"
    // unless push-received happened while we later need it for diagnosis.
    if (stage === 'foregroundWillDisplay') {
      continue;
    }
    // notificationclick only after user taps — not a delivery stop.
    if (stage === 'notificationclick') {
      continue;
    }
    if (!seen[stage]) {
      firstMissing = stage;
      break;
    }
  }

  let stoppedAt: string | null = null;
  let note = '';

  if (hasThrow) {
    stoppedAt = 'showNotification-threw';
    note =
      'showNotification() threw on this device — OS tray cannot appear until this error is fixed.';
  } else if (!seen['push-received']) {
    stoppedAt = 'push-received';
    note =
      'No push event reached this Service Worker. FCM may be delivering elsewhere, SW not controlling the push subscription, or SW not updated yet. Hard-refresh / reopen the site, then retest with the app backgrounded.';
  } else if (!seen['showNotification-called'] && !seen['payload-parsed']) {
    stoppedAt = 'showNotification-called';
    note =
      'Push reached the SW, but showNotification() was never called. OneSignal SW handler did not display (possible payload handling failure after push).';
  } else if (seen['showNotification-called'] && !seen['showNotification-resolved'] && !hasThrow) {
    stoppedAt = 'showNotification-resolved';
    note =
      'showNotification() was called but never resolved — promise hung or SW terminated mid-call.';
  } else if (seen['showNotification-resolved']) {
    stoppedAt = null;
    note =
      'Client pipeline reached showNotification resolved. If the OS tray still missing, the block is below the web app (Chrome site notification channel / Android notification settings), not subscription or SW.';
  } else {
    stoppedAt = firstMissing;
    note = firstMissing
      ? `Pipeline incomplete; first missing stage: ${firstMissing}.`
      : 'No conclusive stop detected.';
  }

  return {
    entries,
    seen,
    firstMissing,
    stoppedAt,
    note,
    hasThrow,
    lastThrow: throws.length ? throws[throws.length - 1]! : null,
  };
}

export async function loadPushTraceReport(): Promise<{
  entries: PushTraceEntry[];
  analysis: PushPipelineAnalysis;
}> {
  const entries = await readPushTraceEntries();
  return { entries, analysis: analyzePushPipeline(entries) };
}

export async function clearPushTrace(): Promise<void> {
  memory.length = 0;
  const db = await openTraceDb();
  if (!db) {
    pushTrace('cleared');
    return;
  }
  try {
    await new Promise<void>((resolve) => {
      try {
        if (!db.objectStoreNames.contains(STORE)) {
          resolve();
          return;
        }
        const tx = db.transaction(STORE, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.objectStore(STORE).clear();
      } catch {
        resolve();
      }
    });
  } finally {
    try {
      db.close();
    } catch {
      /* ignore */
    }
  }
  pushTrace('cleared');
}

function bindServiceWorkerMessages() {
  if (!('serviceWorker' in navigator)) {
    pushTrace('sw-message-bind-skip', { reason: 'no serviceWorker' });
    return;
  }

  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data as { type?: string; entry?: PushTraceEntry } | null;
    if (!data || data.type !== 'tpl-push-trace' || !data.entry) {
      return;
    }
    const entry: PushTraceEntry = {
      ...data.entry,
      source: data.entry.source ?? 'sw-message',
    };
    pushMemory(entry);
    console.info(PREFIX, 'SW→page', entry.stage, entry.detail ?? '');
    // SW already persisted; avoid duplicate IDB rows for the same SW entry.
  });
}

async function logServiceWorkerAndPushState() {
  if (!('serviceWorker' in navigator)) {
    pushTrace('sw-state', { supported: false });
    return;
  }

  const regs = await navigator.serviceWorker.getRegistrations();
  pushTrace(
    'sw-registrations',
    regs.map((reg) => ({
      scope: reg.scope,
      active: reg.active?.scriptURL ?? null,
      waiting: reg.waiting?.scriptURL ?? null,
      installing: reg.installing?.scriptURL ?? null,
    })),
  );

  try {
    const pushManager =
      regs.find((r) => r.scope.includes('/onesignal'))?.pushManager ??
      regs[0]?.pushManager;
    if (pushManager) {
      const sub = await pushManager.getSubscription();
      pushTrace('push-subscription', {
        exists: Boolean(sub),
        endpointTail: sub?.endpoint?.slice(-48) ?? null,
        expirationTime: sub?.expirationTime ?? null,
      });
    } else {
      pushTrace('push-subscription', { exists: false, reason: 'no pushManager' });
    }
  } catch (error) {
    pushTrace('push-subscription-error', {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  pushTrace('notification-permission', {
    permission:
      typeof Notification !== 'undefined' ? Notification.permission : 'unavailable',
  });

  try {
    const OneSignal = (await import('react-onesignal')).default;
    pushTrace('onesignal-subscription-snapshot', {
      subscriptionId: OneSignal.User.PushSubscription.id ?? null,
      optedIn: OneSignal.User.PushSubscription.optedIn ?? null,
      permissionNative: OneSignal.Notifications.permissionNative ?? null,
      externalId: OneSignal.User.externalId ?? null,
    });
  } catch (error) {
    pushTrace('onesignal-subscription-snapshot-failed', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Wire OneSignal + SW tracers once. Safe to call repeatedly.
 */
export async function installPushTraceClient(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  if (!wired) {
    wired = true;
    bindServiceWorkerMessages();
    (
      window as Window & {
        __tplDumpPushTrace?: typeof loadPushTraceReport;
        __tplClearPushTrace?: typeof clearPushTrace;
        __tplPushTrace?: typeof pushTrace;
      }
    ).__tplDumpPushTrace = loadPushTraceReport;
    (
      window as Window & {
        __tplClearPushTrace?: typeof clearPushTrace;
      }
    ).__tplClearPushTrace = clearPushTrace;
    (
      window as Window & {
        __tplPushTrace?: typeof pushTrace;
      }
    ).__tplPushTrace = pushTrace;
    pushTrace('client-wired', { version: 2 });
  }

  await logServiceWorkerAndPushState();

  try {
    const OneSignal = (await import('react-onesignal')).default;
    OneSignal.Notifications.addEventListener(
      'foregroundWillDisplay',
      (event) => {
        pushTrace('foregroundWillDisplay', {
          title: event?.notification?.title ?? null,
          body: event?.notification?.body ?? null,
          notificationId: event?.notification?.notificationId ?? null,
          visibility:
            typeof document !== 'undefined' ? document.visibilityState : null,
        });
      },
    );
    OneSignal.Notifications.addEventListener('click', (event) => {
      pushTrace('onesignal-click', {
        title: event?.notification?.title ?? null,
        notificationId: event?.notification?.notificationId ?? null,
      });
    });
    OneSignal.Notifications.addEventListener('dismiss', (event) => {
      pushTrace('onesignal-dismiss', {
        notificationId: event?.notification?.notificationId ?? null,
      });
    });
    pushTrace('onesignal-listeners-bound');
  } catch (error) {
    pushTrace('onesignal-listeners-failed', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

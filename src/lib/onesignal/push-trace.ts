/**
 * TEMP client-side push pipeline tracer.
 * Dump with: window.__tplDumpPushTrace()
 * Clear with: window.__tplClearPushTrace()
 */

const PREFIX = '[push-trace:client]';
const DB_NAME = 'tpl-push-trace';
const STORE = 'events';
const MAX_MEMORY = 200;

type TraceEntry = {
  stage: string;
  detail?: unknown;
  at: string;
  swScript?: string | null;
  source?: string;
};

const memory: TraceEntry[] = [];
let wired = false;

function pushMemory(entry: TraceEntry) {
  memory.push(entry);
  if (memory.length > MAX_MEMORY) {
    memory.splice(0, memory.length - MAX_MEMORY);
  }
}

export function pushTrace(stage: string, detail?: unknown) {
  const entry: TraceEntry = {
    stage,
    detail: detail ?? null,
    at: new Date().toISOString(),
    source: 'client',
  };
  pushMemory(entry);
  console.info(PREFIX, stage, detail ?? '');
}

async function readIndexedDbEvents(): Promise<TraceEntry[]> {
  if (typeof indexedDB === 'undefined') {
    return [];
  }

  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onerror = () => resolve([]);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { autoIncrement: true });
        }
      };
      req.onsuccess = () => {
        try {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            resolve([]);
            return;
          }
          const tx = db.transaction(STORE, 'readonly');
          const store = tx.objectStore(STORE);
          const getAll = store.getAll();
          getAll.onsuccess = () => {
            resolve((getAll.result as TraceEntry[]) ?? []);
          };
          getAll.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      };
    } catch {
      resolve([]);
    }
  });
}

async function dumpPushTrace() {
  const swEvents = await readIndexedDbEvents();
  const report = {
    memory,
    serviceWorkerIndexedDb: swEvents,
    merged: [...swEvents, ...memory].sort((a, b) => a.at.localeCompare(b.at)),
  };
  console.info(PREFIX, 'DUMP', report);
  return report;
}

async function clearPushTrace() {
  memory.length = 0;
  if (typeof indexedDB === 'undefined') {
    return;
  }
  await new Promise<void>((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
  pushTrace('cleared');
}

function bindServiceWorkerMessages() {
  if (!('serviceWorker' in navigator)) {
    pushTrace('sw-message-bind-skip', { reason: 'no serviceWorker' });
    return;
  }

  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data as { type?: string; entry?: TraceEntry } | null;
    if (!data || data.type !== 'tpl-push-trace' || !data.entry) {
      return;
    }
    const entry = { ...data.entry, source: 'sw-message' };
    pushMemory(entry);
    console.info(PREFIX, 'SW→page', entry.stage, entry.detail ?? '');
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
        __tplDumpPushTrace?: typeof dumpPushTrace;
        __tplClearPushTrace?: typeof clearPushTrace;
        __tplPushTrace?: typeof pushTrace;
      }
    ).__tplDumpPushTrace = dumpPushTrace;
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
    pushTrace('client-wired');
  }

  await logServiceWorkerAndPushState();

  try {
    const OneSignal = (await import('react-onesignal')).default;
    OneSignal.Notifications.addEventListener(
      'foregroundWillDisplay',
      (event) => {
        pushTrace('onesignal-foregroundWillDisplay', {
          title: event?.notification?.title ?? null,
          body: event?.notification?.body ?? null,
          notificationId: event?.notification?.notificationId ?? null,
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

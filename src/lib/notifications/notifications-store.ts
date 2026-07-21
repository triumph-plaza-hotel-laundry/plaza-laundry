import type { AppNotification } from '@/lib/notifications/types';

const STORAGE_KEY = 'tpl-notifications-v1';

const listeners = new Set<() => void>();

function isNotification(value: unknown): value is AppNotification {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Record<string, unknown>;
  const name = item.employeeName;

  return (
    typeof item.id === 'string' &&
    item.type === 'birthday' &&
    typeof item.employeeId === 'string' &&
    typeof item.dateKey === 'string' &&
    typeof item.createdAt === 'string' &&
    typeof item.read === 'boolean' &&
    !!name &&
    typeof name === 'object' &&
    typeof (name as { en?: unknown }).en === 'string' &&
    typeof (name as { ar?: unknown }).ar === 'string'
  );
}

function readStorage(): AppNotification[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isNotification);
  } catch {
    return [];
  }
}

function writeStorage(next: AppNotification[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

let snapshot: AppNotification[] =
  typeof window === 'undefined' ? [] : readStorage();

function emit() {
  listeners.forEach((listener) => listener());
}

function setSnapshot(next: AppNotification[]) {
  snapshot = next;
  writeStorage(next);
  emit();
}

export const notificationsStore = {
  getSnapshot(): AppNotification[] {
    return snapshot;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  replace(next: AppNotification[]) {
    setSnapshot(next);
  },
  update(updater: (current: AppNotification[]) => AppNotification[]) {
    setSnapshot(updater(snapshot));
  },
  markRead(id: string) {
    setSnapshot(
      snapshot.map((item) =>
        item.id === id ? { ...item, read: true } : item,
      ),
    );
  },
  markAllRead() {
    setSnapshot(snapshot.map((item) => ({ ...item, read: true })));
  },
};

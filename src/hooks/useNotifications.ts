import { useEffect, useMemo } from 'react';
import { useCairoToday } from '@/hooks/useCairoToday';
import { useEmployees } from '@/hooks/useEmployees';
import { useSyncStore } from '@/hooks/useSyncStore';
import {
  deletePushInbox,
  markPushInboxRead,
  notificationsStore,
  syncBirthdayNotifications,
  syncPushInboxNotifications,
  type AppNotification,
} from '@/lib/notifications';
import { subscribeLocalDeviceLink } from '@/features/notifications/pairing/local-device-link';

export function useNotifications() {
  const today = useCairoToday();
  const { employees } = useEmployees();
  const notifications = useSyncStore(notificationsStore);

  useEffect(() => {
    syncBirthdayNotifications(today, employees);
  }, [today, employees]);

  useEffect(() => {
    void syncPushInboxNotifications();
    const unsub = subscribeLocalDeviceLink(() => {
      void syncPushInboxNotifications();
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void syncPushInboxNotifications();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    const poll = window.setInterval(() => {
      void syncPushInboxNotifications();
    }, 60_000);
    return () => {
      unsub();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.clearInterval(poll);
    };
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );

  const unreadBirthdayCount = useMemo(
    () =>
      notifications.filter(
        (item) => item.type === 'birthday' && !item.read,
      ).length,
    [notifications],
  );

  return {
    notifications,
    unreadCount,
    unreadBirthdayCount,
    markRead: (id: string) => {
      if (id.startsWith('push:')) {
        void markPushInboxRead(id);
        return;
      }
      notificationsStore.markRead(id);
    },
    markAllRead: () => {
      for (const item of notificationsStore.getSnapshot()) {
        if (item.type === 'push' && !item.read) {
          void markPushInboxRead(item.id);
        }
      }
      notificationsStore.markAllRead();
    },
    deleteNotification: (id: string) => {
      if (id.startsWith('push:')) {
        void deletePushInbox(id);
        return;
      }
      notificationsStore.remove(id);
    },
  };
}

export type { AppNotification };

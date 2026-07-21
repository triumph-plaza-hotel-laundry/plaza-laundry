import { useEffect, useMemo } from 'react';
import { useCairoToday } from '@/hooks/useCairoToday';
import { useEmployees } from '@/hooks/useEmployees';
import { useSyncStore } from '@/hooks/useSyncStore';
import {
  notificationsStore,
  syncBirthdayNotifications,
  type AppNotification,
} from '@/lib/notifications';

export function useNotifications() {
  const today = useCairoToday();
  const { employees } = useEmployees();
  const notifications = useSyncStore(notificationsStore);

  useEffect(() => {
    syncBirthdayNotifications(today, employees);
  }, [today, employees]);

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
    markRead: (id: string) => notificationsStore.markRead(id),
    markAllRead: () => notificationsStore.markAllRead(),
  };
}

export type { AppNotification };

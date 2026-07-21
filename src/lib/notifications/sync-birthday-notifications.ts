import type { LaundryEmployee } from '@/data/laundry-employees';
import {
  getCairoDateKey,
  getEmployeesWithBirthdayToday,
  type CairoDateParts,
} from '@/lib/birthday-utils';
import { notificationsStore } from '@/lib/notifications/notifications-store';
import {
  birthdayNotificationId,
  type AppNotification,
} from '@/lib/notifications/types';

/**
 * Keeps birthday notifications in sync with Cairo "today":
 * - one notification per birthday employee per day
 * - no duplicates for the same employee/day
 * - expired birthday notifications removed after the day ends
 */
export function syncBirthdayNotifications(
  today: CairoDateParts,
  employees: readonly LaundryEmployee[],
): void {
  const dateKey = getCairoDateKey(today);
  const birthdayEmployees = getEmployeesWithBirthdayToday(today, employees);
  const birthdayIds = new Set(birthdayEmployees.map((employee) => employee.id));

  notificationsStore.update((current) => {
    const kept: AppNotification[] = current.filter((notification) => {
      if (notification.type !== 'birthday') {
        return true;
      }

      return (
        notification.dateKey === dateKey &&
        birthdayIds.has(notification.employeeId)
      );
    });

    const existingIds = new Set(kept.map((notification) => notification.id));
    const createdAt = new Date().toISOString();
    const additions: AppNotification[] = [];

    for (const employee of birthdayEmployees) {
      const id = birthdayNotificationId(employee.id, dateKey);
      if (existingIds.has(id)) {
        continue;
      }

      additions.push({
        id,
        type: 'birthday',
        employeeId: employee.id,
        employeeName: {
          en: employee.name.en,
          ar: employee.name.ar,
        },
        dateKey,
        createdAt,
        read: false,
      });
      existingIds.add(id);
    }

    if (additions.length === 0 && kept.length === current.length) {
      const unchanged = kept.every(
        (notification, index) => notification === current[index],
      );
      if (unchanged) {
        return current;
      }
    }

    // Birthdays first (newest additions first), then remaining by createdAt desc.
    return [...additions, ...kept].sort((a, b) => {
      if (a.type === 'birthday' && b.type !== 'birthday') {
        return -1;
      }
      if (b.type === 'birthday' && a.type !== 'birthday') {
        return 1;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  });
}

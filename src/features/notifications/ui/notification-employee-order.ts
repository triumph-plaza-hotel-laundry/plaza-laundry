import type { LaundryEmployee } from '@/data/laundry-employees';

/**
 * Notifications Center employee display order.
 * These six appear first (in this sequence); everyone else follows by catalog sortOrder.
 */
export const NOTIFICATION_EMPLOYEE_PRIORITY_AR_NAMES = [
  'أحمد دبكه',
  'رمضان محمود',
  'أحمد شعبان',
  'محمد حامد',
  'مصطفى محمد',
  'كامل أحمد',
] as const;

/** Stable ID fallback matching the Arabic priority list above. */
export const NOTIFICATION_EMPLOYEE_PRIORITY_IDS = [
  'gm-01',
  'dm-01',
  'ws-01',
  'dm-02',
  'dm-03',
  'wts-01',
] as const;

function priorityRank(employee: LaundryEmployee): number {
  const byName = (
    NOTIFICATION_EMPLOYEE_PRIORITY_AR_NAMES as readonly string[]
  ).indexOf(employee.name.ar);
  if (byName >= 0) {
    return byName;
  }
  const byId = (
    NOTIFICATION_EMPLOYEE_PRIORITY_IDS as readonly string[]
  ).indexOf(employee.id);
  if (byId >= 0) {
    return byId;
  }
  return Number.POSITIVE_INFINITY;
}

/** Sort employees for every Notifications Center selector / list. */
export function sortNotificationEmployees(
  employees: readonly LaundryEmployee[],
): LaundryEmployee[] {
  return [...employees].sort((left, right) => {
    const leftRank = priorityRank(left);
    const rightRank = priorityRank(right);
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return left.sortOrder - right.sortOrder;
  });
}

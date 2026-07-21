export type NotificationType = 'birthday';

export type AppNotification = {
  id: string;
  type: NotificationType;
  employeeId: string;
  employeeName: {
    en: string;
    ar: string;
  };
  /** Cairo calendar day `YYYY-MM-DD` this notification is valid for. */
  dateKey: string;
  createdAt: string;
  read: boolean;
};

export function birthdayNotificationId(
  employeeId: string,
  dateKey: string,
): string {
  return `birthday:${employeeId}:${dateKey}`;
}

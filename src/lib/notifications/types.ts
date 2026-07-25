export type NotificationType = 'birthday' | 'push';

export type AppNotification = {
  id: string;
  type: NotificationType;
  employeeId: string;
  employeeName: {
    en: string;
    ar: string;
  };
  /** Cairo calendar day `YYYY-MM-DD` this notification is valid for (birthdays). */
  dateKey: string;
  createdAt: string;
  read: boolean;
  /** Push / shift content (same as OS notification). */
  title?: string;
  body?: string;
  status?: 'sent' | 'failed' | 'skipped' | 'pending';
};

export function birthdayNotificationId(
  employeeId: string,
  dateKey: string,
): string {
  return `birthday:${employeeId}:${dateKey}`;
}

export function pushInboxNotificationId(serverId: string): string {
  return `push:${serverId}`;
}

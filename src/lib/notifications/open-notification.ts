/**
 * Cross-component bus: OS notification click / deep link → open Notification Center.
 */

export const OPEN_NOTIFICATION_EVENT = 'tpl-open-notification';
export const OPEN_NOTIFICATION_QUERY = 'openNotification';

export type OpenNotificationDetail = {
  /** Server employee_inbox_notifications.id (UUID) */
  inboxId: string;
};

export function pushInboxLocalId(serverInboxId: string): string {
  return `push:${serverInboxId}`;
}

export function requestOpenNotification(inboxId: string): void {
  const id = inboxId.trim();
  if (!id || typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<OpenNotificationDetail>(OPEN_NOTIFICATION_EVENT, {
      detail: { inboxId: id },
    }),
  );
}

export function subscribeOpenNotification(
  handler: (detail: OpenNotificationDetail) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const listener = (event: Event) => {
    const custom = event as CustomEvent<OpenNotificationDetail>;
    const inboxId = custom.detail?.inboxId?.trim();
    if (inboxId) {
      handler({ inboxId });
    }
  };

  window.addEventListener(OPEN_NOTIFICATION_EVENT, listener);
  return () => window.removeEventListener(OPEN_NOTIFICATION_EVENT, listener);
}

/** Read and clear ?openNotification= from the current URL. */
export function consumeOpenNotificationQuery(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const url = new URL(window.location.href);
    const inboxId = url.searchParams.get(OPEN_NOTIFICATION_QUERY)?.trim() || null;
    if (!inboxId) {
      return null;
    }
    url.searchParams.delete(OPEN_NOTIFICATION_QUERY);
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, '', next || '/');
    return inboxId;
  } catch {
    return null;
  }
}

export function buildOpenNotificationPath(inboxId: string): string {
  return `/?${OPEN_NOTIFICATION_QUERY}=${encodeURIComponent(inboxId.trim())}`;
}

/** Service worker / OneSignal postMessage → same bus as CustomEvent. */
export function bindOpenNotificationMessageListener(): () => void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  const onMessage = (event: MessageEvent) => {
    const data = event.data as
      | { type?: string; inboxId?: string | null }
      | undefined;
    if (data?.type !== 'tpl-open-notification') {
      return;
    }
    const inboxId =
      typeof data.inboxId === 'string' ? data.inboxId.trim() : '';
    if (inboxId) {
      requestOpenNotification(inboxId);
    }
  };

  navigator.serviceWorker.addEventListener('message', onMessage);
  return () => {
    navigator.serviceWorker.removeEventListener('message', onMessage);
  };
}

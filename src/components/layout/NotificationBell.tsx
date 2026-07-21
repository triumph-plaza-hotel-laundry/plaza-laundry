import { Crown, Bell } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type AnimationEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { useNotifications } from '@/hooks/useNotifications';
import type { AppNotification } from '@/lib/notifications';
import '@/components/layout/notification-bell.css';

const ICON_STROKE = 1.75;
const ICON_SIZE = 18;
const PANEL_EXIT_MS = 180;

function getEmployeeDisplayName(
  notification: AppNotification,
  language: 'en' | 'ar',
) {
  return language === 'ar'
    ? notification.employeeName.ar || notification.employeeName.en
    : notification.employeeName.en || notification.employeeName.ar;
}

export function NotificationBell() {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    unreadBirthdayCount,
    markRead,
    markAllRead,
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [isPanelMounted, setIsPanelMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const lang = language === 'ar' ? 'ar' : 'en';

  useEffect(() => {
    if (isOpen) {
      setIsPanelMounted(true);
    }
  }, [isOpen]);

  /* Unmount fallback when exit animation is skipped (reduced motion) or missed. */
  useEffect(() => {
    if (isOpen || !isPanelMounted) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsPanelMounted(false);
    }, PANEL_EXIT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, isPanelMounted]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const handleNotificationClick = (notification: AppNotification) => {
    markRead(notification.id);
    setIsOpen(false);

    if (notification.type === 'birthday' && notification.employeeId) {
      navigate(
        `/employees?highlight=${encodeURIComponent(notification.employeeId)}`,
      );
    }
  };

  const handlePanelAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (!isOpen) {
      setIsPanelMounted(false);
    }
  };

  const hasUnreadBirthday = unreadBirthdayCount > 0;
  const badgeLabel =
    unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <div className="notification-bell" ref={rootRef}>
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={
          unreadCount > 0
            ? t('common.notificationsUnread').replace(
                '{count}',
                String(unreadCount),
              )
            : t('common.notifications')
        }
        className={`luxury-header__control luxury-header__notification${hasUnreadBirthday ? ' luxury-header__notification--birthday-pulse' : ''}`}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <Bell aria-hidden="true" size={ICON_SIZE} strokeWidth={ICON_STROKE} />
        {badgeLabel ? (
          <span aria-hidden="true" className="notification-bell__badge">
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {isPanelMounted ? (
        <div
          className={`notification-bell__panel${isOpen ? ' notification-bell__panel--open' : ' notification-bell__panel--closing'}`}
          id={panelId}
          role="region"
          aria-label={t('common.notifications')}
          onAnimationEnd={handlePanelAnimationEnd}
        >
          <div className="notification-bell__header">
            <h2 className="notification-bell__title">
              {t('common.notifications')}
            </h2>
            {unreadCount > 0 ? (
              <button
                className="notification-bell__mark-all"
                onClick={markAllRead}
                type="button"
              >
                {t('common.notificationsMarkAllRead')}
              </button>
            ) : null}
          </div>

          {notifications.length === 0 ? (
            <p className="notification-bell__empty">
              {t('common.notificationsEmpty')}
            </p>
          ) : (
            <ul className="notification-bell__list">
              {notifications.map((notification) => {
                const isBirthday = notification.type === 'birthday';
                const employeeName = getEmployeeDisplayName(notification, lang);
                const title = isBirthday
                  ? t('employees.birthdayNotificationTitle')
                  : t('common.notifications');
                const message = isBirthday
                  ? t('employees.birthdayNotificationWish')
                  : '';

                return (
                  <li
                    className="notification-bell__list-item"
                    key={notification.id}
                  >
                    <button
                      className={`notification-bell__item${isBirthday ? ' notification-bell__item--birthday' : ''}${notification.read ? ' notification-bell__item--read' : ' notification-bell__item--unread'}`}
                      onClick={() => handleNotificationClick(notification)}
                      type="button"
                    >
                      <span className="notification-bell__content">
                        <span className="notification-bell__item-title">
                          <span aria-hidden="true" className="notification-bell__emoji">
                            🎉
                          </span>
                          {title}
                        </span>
                        {employeeName ? (
                          <span className="notification-bell__item-name">
                            {employeeName}
                          </span>
                        ) : null}
                        {message ? (
                          <span className="notification-bell__item-message">
                            {message}
                          </span>
                        ) : null}
                      </span>

                      {isBirthday && !notification.read ? (
                        <span
                          aria-hidden="true"
                          className="notification-bell__crown"
                        >
                          <Crown size={15} strokeWidth={1.7} />
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

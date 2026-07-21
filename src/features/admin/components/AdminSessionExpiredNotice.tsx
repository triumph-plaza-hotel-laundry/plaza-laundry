import { useEffect, useState } from 'react';
import { consumeAdminSessionExpiredNotice } from '@/features/admin/admin-session';
import { useLanguage } from '@/hooks';
import '@/features/admin/admin-session-notice.css';

export function AdminSessionExpiredNotice() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (consumeAdminSessionExpiredNotice()) {
      setVisible(true);
    }
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="admin-session-notice"
      role="status"
      aria-live="polite"
    >
      <p className="admin-session-notice__text">
        {t('auth.adminSessionExpired')}
      </p>
      <button
        className="admin-session-notice__dismiss"
        onClick={() => setVisible(false)}
        type="button"
      >
        {t('common.dismiss')}
      </button>
    </div>
  );
}

import { ShieldOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks';

type AdminPermissionDeniedProps = {
  message?: string;
};

export function AdminPermissionDenied({
  message = 'You do not have permission to access this page.',
}: AdminPermissionDeniedProps) {
  const { t } = useLanguage();

  return (
    <section className="admin-permission-denied mx-auto" role="alert">
      <div className="admin-permission-denied__card">
        <ShieldOff className="admin-permission-denied__icon" size={28} strokeWidth={1.6} />
        <h1>{message}</h1>
        <Link className="admin-permission-denied__link" to="/admin">
          {t('admin.dashboard.title')}
        </Link>
      </div>
    </section>
  );
}

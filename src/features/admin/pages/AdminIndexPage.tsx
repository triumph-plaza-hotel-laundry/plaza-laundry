import { Link } from 'react-router-dom';
import { preloadRoute } from '@/app/route-preload';
import { AdminBackButton } from '@/features/admin/components/AdminBackButton';
import { adminDashboardModules } from '@/features/admin/config/admin-dashboard-modules';
import { useAuth, useLanguage } from '@/hooks';
import '@/features/admin/admin-dashboard.css';

export function AdminIndexPage() {
  const { t } = useLanguage();
  const { logout, user } = useAuth();

  return (
    <section
      aria-label={t('admin.dashboard.title')}
      className="admin-dashboard mx-auto"
    >
      <div className="admin-page-header__back-row admin-dashboard__back-row">
        <AdminBackButton />
      </div>
      <header className="admin-dashboard__header">
        <span aria-hidden="true" className="admin-dashboard__emoji">
          ✦
        </span>
        <h1 className="admin-dashboard__title">{t('admin.dashboard.title')}</h1>
        <p className="admin-dashboard__subtitle">
          {t('admin.dashboard.subtitle')}
        </p>
        {user ? (
          <p className="admin-dashboard__welcome">
            {t('admin.dashboard.welcome').replace(
              '{name}',
              user.displayName || user.username,
            )}
          </p>
        ) : null}
      </header>

      <nav
        aria-label={t('admin.dashboard.title')}
        className="admin-dashboard__grid"
      >
        {adminDashboardModules.map((module) => {
          const Icon = module.icon;

          return (
            <Link
              className="admin-dashboard__card"
              key={module.path}
              onFocus={() => preloadRoute(module.path)}
              onPointerEnter={() => preloadRoute(module.path)}
              to={module.path}
            >
              <span aria-hidden="true" className="admin-dashboard__card-icon">
                <Icon size={20} strokeWidth={1.5} />
              </span>
              <span className="admin-dashboard__card-title">
                {t(module.labelKey)}
              </span>
              <span className="admin-dashboard__card-desc">
                {t(module.descriptionKey)}
              </span>
            </Link>
          );
        })}
      </nav>

      <footer className="admin-dashboard__footer">
        <button
          className="admin-dashboard__logout"
          onClick={logout}
          type="button"
        >
          {t('admin.dashboard.logout')}
        </button>
      </footer>
    </section>
  );
}

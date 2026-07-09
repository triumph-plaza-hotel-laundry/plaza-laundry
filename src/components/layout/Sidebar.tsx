import { AnimatePresence, motion } from 'framer-motion';
import { memo, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { preloadRoute } from '@/app/route-preload';
import { X } from 'lucide-react';
import logoUrl from '@/assets/images/logo.png';
import { navigationItems } from '@/config/navigation';
import { canAccessAdminPortal } from '@/features/auth/permissions';
import { useAuth, useLanguage } from '@/hooks';
import { cn } from '@/lib/styles';
import { IconButton } from '@/components/ui';
import '@/components/layout/sidebar.css';

const SIDEBAR_ICON_STROKE = 1.75;

type SidebarProps = {
  isDesktop: boolean;
  isOpen: boolean;
  onClose: () => void;
};

export const Sidebar = memo(function Sidebar({ isDesktop, isOpen, onClose }: SidebarProps) {
  const { canAccessPath, isAuthenticated, role } = useAuth();
  const { direction, t } = useLanguage();

  const closedOffset = direction === 'rtl' ? '100%' : '-100%';

  const resolveNavPath = useCallback(
    (path: string, resource: (typeof navigationItems)[number]['resource']) => {
      if (resource === 'admin') {
        return isAuthenticated && role && canAccessAdminPortal(role) && canAccessPath('/admin')
          ? '/admin'
          : '/admin/login';
      }

      return path;
    },
    [canAccessPath, isAuthenticated, role],
  );

  const sidebarContent = (
    <aside className="luxury-sidebar">
      <div className="luxury-sidebar__branding">
        {!isDesktop ? (
          <IconButton
            className="luxury-sidebar__close"
            label={t('common.closeMenu')}
            onClick={onClose}
          >
            <X className="luxury-icon" strokeWidth={1.75} />
          </IconButton>
        ) : null}

        <div className="luxury-sidebar__brand">
          <div className="luxury-sidebar__logo-frame">
            <img
              alt=""
              className="luxury-sidebar__logo"
              decoding="async"
              draggable={false}
              src={logoUrl}
            />
          </div>
          <p className="luxury-sidebar__brand-name">{t('sidebar.brandName')}</p>
        </div>

        <hr aria-hidden="true" className="luxury-sidebar__brand-divider" />
      </div>

      <nav aria-label={t('common.menu')} className="luxury-sidebar__nav">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const targetPath = resolveNavPath(item.path, item.resource);

          return (
            <NavLink
              className={({ isActive }) =>
                cn('luxury-sidebar__item', isActive && 'luxury-sidebar__item--active')
              }
              end={item.end ?? item.resource === 'admin'}
              key={item.path}
              onClick={onClose}
              onFocus={() => preloadRoute(targetPath)}
              onPointerEnter={() => preloadRoute(targetPath)}
              to={targetPath}
            >
              <Icon
                aria-hidden="true"
                className="luxury-sidebar__icon"
                size={18}
                strokeWidth={SIDEBAR_ICON_STROKE}
              />
              <span className="luxury-sidebar__label">{t(item.labelKey)}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <>
      {isDesktop ? (
        <div className="luxury-sidebar-shell luxury-sidebar-shell--desktop">{sidebarContent}</div>
      ) : null}

      {!isDesktop ? (
        <AnimatePresence>
          {isOpen ? (
            <div className="luxury-sidebar-shell luxury-sidebar-shell--drawer">
              <motion.button
                aria-label={t('common.closeMenu')}
                className="absolute inset-0 bg-[var(--overlay-scrim)] backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                transition={{ duration: 0.16 }}
                type="button"
              />
              <motion.div
                className={cn(
                  'relative h-full w-fit p-3 gpu-smooth',
                  direction === 'rtl' && 'ms-auto',
                )}
                initial={{ opacity: 0, x: closedOffset }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: closedOffset }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {sidebarContent}
              </motion.div>
            </div>
          ) : null}
        </AnimatePresence>
      ) : null}
    </>
  );
});

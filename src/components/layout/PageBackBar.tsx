import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMobileNav } from '@/context/mobile-nav-context';
import { useLanguage } from '@/hooks';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  getDetailPageParentPath,
  isMainSidebarAppPage,
} from '@/lib/page-navigation';
import '@/components/layout/page-back-bar.css';

const HIDDEN_PATHS = new Set(['/', '/access-denied', '/admin/login']);
const DESKTOP_SIDEBAR_QUERY = '(min-width: 1024px)';

export function PageBackBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const mobileNav = useMobileNav();
  const isDesktop = useMediaQuery(DESKTOP_SIDEBAR_QUERY);

  if (HIDDEN_PATHS.has(location.pathname)) {
    return null;
  }

  const handleBack = () => {
    const detailParent = getDetailPageParentPath(location.pathname);
    if (detailParent) {
      navigate(detailParent);
      return;
    }

    // Main sidebar pages on mobile: reopen the menu instead of leaving for Home.
    if (
      !isDesktop &&
      isMainSidebarAppPage(location.pathname) &&
      mobileNav
    ) {
      mobileNav.openMobileSidebarFromBack();
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    if (location.pathname.startsWith('/admin')) {
      navigate('/admin');
      return;
    }

    navigate('/');
  };

  return (
    <div className="page-back-bar">
      <button className="page-back-bar__btn" onClick={handleBack} type="button">
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        <span className="page-back-bar__label-en">{t('common.back')}</span>
        <span className="page-back-bar__label-ar">{t('common.backAr')}</span>
      </button>
    </div>
  );
}

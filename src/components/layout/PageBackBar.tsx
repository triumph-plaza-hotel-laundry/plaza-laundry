import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks';
import '@/components/layout/page-back-bar.css';

const HIDDEN_PATHS = new Set(['/', '/access-denied', '/admin/login']);

export function PageBackBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  if (HIDDEN_PATHS.has(location.pathname)) {
    return null;
  }

  const handleBack = () => {
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

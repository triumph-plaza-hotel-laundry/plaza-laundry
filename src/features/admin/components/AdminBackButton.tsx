import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks';

type AdminBackButtonProps = {
  fallbackPath?: string;
};

export function AdminBackButton({ fallbackPath = '/admin' }: AdminBackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    if (location.pathname === fallbackPath) {
      navigate('/');
      return;
    }

    navigate(fallbackPath);
  };

  return (
    <button className="admin-back-btn" onClick={handleBack} type="button">
      <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
      {t('admin.back')}
    </button>
  );
}

import { logoUrl } from '@/assets/images';
import { useLanguage } from '@/hooks';
import { cn } from '@/lib/styles';
import '@/components/layout/header-logo.css';

type HeaderLogoProps = {
  className?: string;
};

export function HeaderLogo({ className }: HeaderLogoProps) {
  const { t } = useLanguage();

  return (
    <img
      alt={t('app.name')}
      className={cn('header-logo', className)}
      decoding="async"
      draggable={false}
      src={logoUrl}
    />
  );
}

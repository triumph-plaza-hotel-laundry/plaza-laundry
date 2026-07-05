import type { ReactNode } from 'react';
import { AdminBackButton } from '@/features/admin/components/AdminBackButton';

type AdminPageHeaderProps = {
  titleEn: string;
  titleAr: string;
  subtitle?: string;
  children?: ReactNode;
  showBack?: boolean;
  backFallbackPath?: string;
};

export function AdminPageHeader({
  titleEn,
  titleAr,
  subtitle,
  children,
  showBack = false,
  backFallbackPath,
}: AdminPageHeaderProps) {
  return (
    <header className="admin-page-header">
      {showBack ? (
        <div className="admin-page-header__back-row">
          <AdminBackButton fallbackPath={backFallbackPath} />
        </div>
      ) : null}
      <div className="admin-page-header__titles">
        <span aria-hidden="true" className="admin-page-header__emoji">
          ✦
        </span>
        <h1 className="admin-page-header__title-en">{titleEn}</h1>
        <h1 className="admin-page-header__title-ar">{titleAr}</h1>
        {subtitle ? <p className="admin-page-header__subtitle">{subtitle}</p> : null}
      </div>
      {children}
    </header>
  );
}

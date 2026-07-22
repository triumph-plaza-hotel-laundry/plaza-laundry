import type { ReactNode } from 'react';

type AdminPageHeaderProps = {
  titleEn: string;
  titleAr: string;
  subtitle?: string;
  children?: ReactNode;
};

/**
 * Shared Admin page titles.
 * Back navigation is provided once by AdminLayout — do not duplicate here.
 */
export function AdminPageHeader({
  titleEn,
  titleAr,
  subtitle,
  children,
}: AdminPageHeaderProps) {
  return (
    <header className="admin-page-header">
      <div className="admin-page-header__titles">
        <span aria-hidden="true" className="admin-page-header__emoji">
          ✦
        </span>
        <h1 className="admin-page-header__title-en">{titleEn}</h1>
        <h1 className="admin-page-header__title-ar">{titleAr}</h1>
        {subtitle ? (
          <p className="admin-page-header__subtitle">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </header>
  );
}

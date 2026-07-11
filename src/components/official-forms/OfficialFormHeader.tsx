import { logoUrl } from '@/assets/images';
import { useLanguage } from '@/hooks';

type OfficialFormHeaderProps = {
  titleEn: string;
  titleAr: string;
  subtitleEn?: string;
  subtitleAr?: string;
  badgeEn?: string;
  badgeAr?: string;
};

export function OfficialFormHeader({
  titleEn,
  titleAr,
  subtitleEn,
  subtitleAr,
  badgeEn,
  badgeAr,
}: OfficialFormHeaderProps) {
  const { t } = useLanguage();

  return (
    <header className="tpl-official-sheet__header">
      <div className="tpl-official-sheet__brand">
        <img
          alt={t('app.name')}
          className="tpl-official-sheet__logo"
          decoding="async"
          draggable={false}
          src={logoUrl}
        />
        <div className="tpl-official-sheet__hotel">
          <p className="tpl-official-sheet__hotel-en">Triumph Plaza Hotel</p>
          <p className="tpl-official-sheet__hotel-ar">فندق تريومف بلازا</p>
          <p className="tpl-official-sheet__dept-en">Laundry Department</p>
          <p className="tpl-official-sheet__dept-ar">قسم الغسيل</p>
        </div>
      </div>

      <div className="tpl-official-sheet__title-block">
        <h1 className="tpl-official-sheet__title-en">{titleEn}</h1>
        <h1 className="tpl-official-sheet__title-ar">{titleAr}</h1>
        {subtitleEn ? (
          <p className="tpl-official-sheet__subtitle-en">{subtitleEn}</p>
        ) : null}
        {subtitleAr ? (
          <p className="tpl-official-sheet__subtitle-ar">{subtitleAr}</p>
        ) : null}
        {badgeEn && badgeAr ? (
          <div className="tpl-official-sheet__badge">
            <span className="tpl-official-sheet__badge-ar">{badgeAr}</span>
            <span className="tpl-official-sheet__badge-en">{badgeEn}</span>
          </div>
        ) : null}
      </div>
    </header>
  );
}

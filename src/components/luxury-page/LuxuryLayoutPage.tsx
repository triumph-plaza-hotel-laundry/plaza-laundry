import { useLanguage } from '@/hooks';
import type { TranslationKey } from '@/types/language';
import '@/components/luxury-page/luxury-layout-page.css';

type LuxuryLayoutPageProps = {
  ariaLabelKey: TranslationKey;
  contentClassName?: string;
  pageClass: string;
  subtitleArKey: TranslationKey;
  subtitleKey: TranslationKey;
  titleArKey: TranslationKey;
  titleKey: TranslationKey;
};

export function LuxuryLayoutPage({
  ariaLabelKey,
  contentClassName,
  pageClass,
  subtitleArKey,
  subtitleKey,
  titleArKey,
  titleKey,
}: LuxuryLayoutPageProps) {
  const { t } = useLanguage();

  return (
    <section className={`luxury-layout-page ${pageClass} mx-auto`}>
      <header className="luxury-layout-page__header">
        <div className="luxury-layout-page__title-block">
          <span aria-hidden="true" className="luxury-layout-page__emoji">
            ✦
          </span>
          <h1 className="luxury-layout-page__title-en">{t(titleKey)}</h1>
          <h1 className="luxury-layout-page__title-ar">{t(titleArKey)}</h1>
          <p className="luxury-layout-page__subtitle-en">{t(subtitleKey)}</p>
          <p className="luxury-layout-page__subtitle-ar">{t(subtitleArKey)}</p>
        </div>
      </header>

      <div
        aria-label={t(ariaLabelKey)}
        className={`luxury-layout-page__content${contentClassName ? ` ${contentClassName}` : ''}`}
      />
    </section>
  );
}

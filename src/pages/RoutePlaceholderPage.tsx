import type { TranslationKey } from '@/types/language';
import { useLanguage } from '@/hooks';

type RoutePlaceholderPageProps = {
  titleKey: TranslationKey;
};

export function RoutePlaceholderPage({ titleKey }: RoutePlaceholderPageProps) {
  const { t } = useLanguage();

  return (
    <section className="luxury-page-shell mx-auto">
      <div className="luxury-card bg-[var(--app-surface)]">
        <p className="luxury-page-eyebrow">{t('page.placeholder')}</p>
        <h1 className="luxury-page-title">{t(titleKey)}</h1>
      </div>
    </section>
  );
}

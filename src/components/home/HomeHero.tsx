import { useLanguage } from '@/hooks';
import '@/components/home/home-hero.css';

export function HomeHero() {
  const { t } = useLanguage();

  return (
    <section className="home-hero" aria-label={t('app.name')}>
      <div aria-hidden="true" className="home-hero__atmosphere">
        <div className="home-hero__volumetric" />
      </div>
    </section>
  );
}

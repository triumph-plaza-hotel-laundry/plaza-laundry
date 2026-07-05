import heroImageUrl from '@/assets/images/eslam.png';
import { useLanguage } from '@/hooks';
import '@/components/home/home-hero.css';

export function HomeHero() {
  const { t } = useLanguage();

  return (
    <section className="home-hero" aria-label={t('app.name')}>
      <div aria-hidden="true" className="home-hero__atmosphere">
        <div className="home-hero__volumetric" />
      </div>

      <div className="home-hero__content">
        <div className="home-hero__showcase">
          <div className="home-hero__showcase-stack">
            <div className="home-hero__bird-stage">
              <div className="home-hero__bird">
                <img
                  alt={t('app.name')}
                  className="home-hero__showcase-img"
                  decoding="async"
                  draggable={false}
                  src={heroImageUrl}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

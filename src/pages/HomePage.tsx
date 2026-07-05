import { HomeHero } from '@/components/home/HomeHero';
import '@/pages/home-page.css';

export function HomePage() {
  return (
    <div className="home-page">
      <div aria-hidden="true" className="home-page__backdrop">
        <div className="home-page__bg home-page__bg--dark" />
        <div className="home-page__bg home-page__bg--light" />
        <div className="home-page__overlay" />
      </div>
      <HomeHero />
    </div>
  );
}

import { HomeCinematicBackground } from '@/components/home/HomeCinematicBackground';
import { HomeHero } from '@/components/home/HomeHero';
import { HomeShiftPlanSection } from '@/components/home/HomeShiftPlanSection';
import '@/pages/home-page.css';

export function HomePage() {
  return (
    <div className="home-page">
      <HomeCinematicBackground />
      <HomeHero />
      <HomeShiftPlanSection />
    </div>
  );
}

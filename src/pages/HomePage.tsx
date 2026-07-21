import { HomeCinematicBackground } from '@/components/home/HomeCinematicBackground';
import { HomeHero } from '@/components/home/HomeHero';
import { HomeShiftPlanSection } from '@/components/home/HomeShiftPlanSection';
import { AdminSessionExpiredNotice } from '@/features/admin/components/AdminSessionExpiredNotice';
import '@/pages/home-page.css';

export function HomePage() {
  return (
    <div className="home-page">
      <AdminSessionExpiredNotice />
      <HomeCinematicBackground />
      <HomeHero />
      <HomeShiftPlanSection />
    </div>
  );
}

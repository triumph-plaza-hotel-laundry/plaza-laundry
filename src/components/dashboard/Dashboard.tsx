import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { DashboardHero } from '@/components/dashboard/DashboardHero';

export function Dashboard() {
  return (
    <section className="luxury-page-shell mx-auto">
      <DashboardHero />
      <hr aria-hidden="true" className="luxury-section-divider" />
      <DashboardGrid />
    </section>
  );
}

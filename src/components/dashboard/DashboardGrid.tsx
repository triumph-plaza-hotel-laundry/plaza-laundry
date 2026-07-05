import { dashboardCards } from '@/components/dashboard/dashboard.config';
import { DashboardCard } from '@/components/dashboard/DashboardCard';

export function DashboardGrid() {
  return (
    <section className="grid gap-[var(--section-gap-y)] sm:grid-cols-2 xl:grid-cols-3">
      {dashboardCards.map((item, index) => (
        <DashboardCard item={item} index={index} key={item.title} />
      ))}
    </section>
  );
}

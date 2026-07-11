import { motion } from 'framer-motion';
import type { DashboardCardItem } from '@/components/dashboard/dashboard.config';

type DashboardCardProps = {
  item: DashboardCardItem;
  index: number;
};

export function DashboardCard({ item, index }: DashboardCardProps) {
  const Icon = item.icon;

  return (
    <motion.article
      className="luxury-card group relative overflow-hidden transition-colors duration-150 hover:border-[var(--app-gold-border)]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay: index * 0.035, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
    >
      <div className="relative">
        <div className="flex size-11 items-center justify-center rounded-[var(--card-radius)] border border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--app-gold)]">
          <Icon
            aria-hidden="true"
            className="luxury-icon"
            size={18}
            strokeWidth={1.75}
          />
        </div>

        <h2 className="luxury-page-title mt-4 text-lg">{item.title}</h2>
        <p className="luxury-page-subtitle mt-2 text-sm">{item.subtitle}</p>

        <hr className="luxury-section-divider mt-4" />
        <p className="luxury-page-eyebrow mt-3 text-[0.6875rem] tracking-[0.22em]">
          Ready
        </p>
      </div>
    </motion.article>
  );
}

import { motion } from 'framer-motion';

export function DashboardHero() {
  return (
    <motion.section
      className="luxury-card dashboard-hero-surface relative overflow-hidden"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: 'easeOut' }}
    >
      <div className="relative max-w-3xl">
        <p className="luxury-page-eyebrow">Triumph Plaza Hotel Laundry</p>
        <h1 className="luxury-page-title">Welcome Dashboard</h1>
        <p className="luxury-page-subtitle">
          A premium operations entry prepared for the next phase of the hotel
          laundry experience.
        </p>
      </div>
    </motion.section>
  );
}

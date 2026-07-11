import { motion } from 'framer-motion';
import type { LaundryEmployee } from '@/data/laundry-employees';
import { useLanguage } from '@/hooks';

type ShiftEmployeeMiniCardProps = {
  employee: LaundryEmployee;
  index: number;
};

export function ShiftEmployeeMiniCard({
  employee,
  index,
}: ShiftEmployeeMiniCardProps) {
  const { language } = useLanguage();
  const name = language === 'ar' ? employee.name.ar : employee.name.en;
  const jobTitle =
    language === 'ar' ? employee.jobTitle.ar : employee.jobTitle.en;

  return (
    <motion.article
      className="shift-mini-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.04, ease: 'easeOut' }}
    >
      <p className="shift-mini-card__name">{name}</p>
      <p className="shift-mini-card__title">{jobTitle}</p>
    </motion.article>
  );
}

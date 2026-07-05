import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import type { LaundryEmployee } from '@/data/laundry-employees';
import { useCairoToday, useLanguage } from '@/hooks';
import { isBirthdayOnDate } from '@/lib/birthday-utils';

type OrgChartEmployeeCardProps = {
  employee: LaundryEmployee;
  index: number;
  size?: 'executive' | 'standard' | 'compact';
};

export function OrgChartEmployeeCard({
  employee,
  index,
  size = 'standard',
}: OrgChartEmployeeCardProps) {
  const { t } = useLanguage();
  const today = useCairoToday();
  const isBirthdayToday = isBirthdayOnDate(employee.dateOfBirth.en, today);

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className={`org-employee-card org-employee-card--${size}${isBirthdayToday ? ' org-employee-card--birthday' : ''}`}
      initial={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.32, delay: index * 0.04, ease: 'easeOut' }}
    >
      <div className="org-employee-card__avatar-wrap">
        <User aria-hidden="true" className="org-employee-card__avatar-icon" strokeWidth={1.5} />
        {isBirthdayToday ? (
          <span
            aria-label={t('employees.birthdayToday')}
            className="org-employee-card__birthday-badge"
            title={t('employees.birthdayToday')}
          >
            🎂
          </span>
        ) : null}
      </div>

      <div className="org-employee-card__content">
        <p className="org-employee-card__name-ar">{employee.name.ar}</p>
        <h3 className="org-employee-card__name-en">{employee.name.en}</h3>
        <p className="org-employee-card__title-ar">{employee.jobTitle.ar}</p>
        <p className="org-employee-card__title-en">{employee.jobTitle.en}</p>
      </div>

      <span className="org-employee-card__status">
        <span className="org-employee-card__status-dot" aria-hidden="true" />
        <span className="org-employee-card__status-en">{t('employees.org.statusActive')}</span>
        <span className="org-employee-card__status-ar">{t('employees.org.statusActiveAr')}</span>
      </span>
    </motion.article>
  );
}

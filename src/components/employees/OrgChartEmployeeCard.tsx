import { User } from 'lucide-react';
import { motion } from 'framer-motion';
import type { LaundryEmployee } from '@/data/laundry-employees';
import { useCairoToday, useLanguage } from '@/hooks';
import { isEmployeeBirthdayToday } from '@/lib/birthday-utils';
import { RoyalBirthdayCrown } from '@/components/employees/RoyalBirthdayCrown';

type OrgChartEmployeeCardProps = {
  employee: LaundryEmployee;
  index: number;
  size?: 'executive' | 'standard' | 'compact';
  highlight?: boolean;
};

export function OrgChartEmployeeCard({
  employee,
  index,
  size = 'standard',
  highlight = false,
}: OrgChartEmployeeCardProps) {
  const { t } = useLanguage();
  const today = useCairoToday();
  const isBirthdayToday = isEmployeeBirthdayToday(employee.dateOfBirth, today);

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      aria-label={
        isBirthdayToday ? t('employees.birthdayToday') : undefined
      }
      className={`org-employee-card org-employee-card--${size}${isBirthdayToday ? ' org-employee-card--birthday' : ''}${highlight ? ' org-employee-card--highlight' : ''}`}
      data-employee-id={employee.id}
      initial={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.32, delay: index * 0.04, ease: 'easeOut' }}
    >
      <div className="org-employee-card__avatar-wrap">
        {isBirthdayToday ? (
          <RoyalBirthdayCrown className="org-employee-card__royal-crown" />
        ) : null}

        <User
          aria-hidden="true"
          className="org-employee-card__avatar-icon"
          strokeWidth={1.5}
        />
      </div>

      <div className="org-employee-card__content">
        <p className="org-employee-card__name-ar">{employee.name.ar}</p>
        <h3 className="org-employee-card__name-en">{employee.name.en}</h3>
        <p className="org-employee-card__title-ar">{employee.jobTitle.ar}</p>
        <p className="org-employee-card__title-en">{employee.jobTitle.en}</p>
      </div>

      <span className="org-employee-card__status">
        <span className="org-employee-card__status-dot" aria-hidden="true" />
        <span className="org-employee-card__status-en">
          {t('employees.org.statusActive')}
        </span>
        <span className="org-employee-card__status-ar">
          {t('employees.org.statusActiveAr')}
        </span>
      </span>
    </motion.article>
  );
}

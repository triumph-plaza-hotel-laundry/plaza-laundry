import { motion } from 'framer-motion';
import { Briefcase, IdCard, Phone, User } from 'lucide-react';
import type { LaundryEmployee } from '@/data/laundry-employees';
import { useLanguage } from '@/hooks';
import type { TranslationKey } from '@/types/language';

type EmployeeCardProps = {
  employee: LaundryEmployee;
  index: number;
};

const fieldLabelKeys = {
  jobTitle: 'employees.fields.jobTitle',
  employeeId: 'employees.fields.employeeId',
  phone: 'employees.fields.phone',
} as const satisfies Record<string, TranslationKey>;

export function EmployeeCard({ employee, index }: EmployeeCardProps) {
  const { t } = useLanguage();

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className={`employee-card employee-card--${employee.tier}`}
      initial={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.32, delay: index * 0.04, ease: 'easeOut' }}
    >
      <div className="employee-card__avatar-wrap">
        <User
          aria-hidden="true"
          className="employee-card__avatar"
          strokeWidth={1.5}
        />
      </div>

      <div className="employee-card__body">
        <h3 className="employee-card__name">{employee.name.en}</h3>
        <p className="employee-card__name-alt">{employee.name.ar}</p>

        <div className="employee-card__fields">
          <div className="employee-card__field">
            <Briefcase
              aria-hidden="true"
              className="employee-card__field-icon"
              strokeWidth={1.75}
            />
            <div className="employee-card__field-content">
              <span className="employee-card__field-label">
                {t(fieldLabelKeys.jobTitle)}
              </span>
              <span className="employee-card__field-value employee-card__field-value--ar">
                {employee.jobTitle.ar}
              </span>
              <span className="employee-card__field-value employee-card__field-value--en">
                {employee.jobTitle.en}
              </span>
            </div>
          </div>

          <div className="employee-card__field">
            <IdCard
              aria-hidden="true"
              className="employee-card__field-icon"
              strokeWidth={1.75}
            />
            <div className="employee-card__field-content">
              <span className="employee-card__field-label">
                {t(fieldLabelKeys.employeeId)}
              </span>
              <span className="employee-card__field-value employee-card__field-value--mono">
                {employee.employeeId}
              </span>
            </div>
          </div>

          <div className="employee-card__field">
            <Phone
              aria-hidden="true"
              className="employee-card__field-icon"
              strokeWidth={1.75}
            />
            <div className="employee-card__field-content">
              <span className="employee-card__field-label">
                {t(fieldLabelKeys.phone)}
              </span>
              <a
                className="employee-card__field-value employee-card__field-link"
                href={`tel:${employee.phone.replace(/\s/g, '')}`}
              >
                {employee.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

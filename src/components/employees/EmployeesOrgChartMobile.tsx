import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { OrgChartEmployeeCard } from '@/components/employees/OrgChartEmployeeCard';
import type { EmployeesOrgChart, StaffDepartmentGroup } from '@/lib/employees-org-chart';
import type { LaundryEmployee } from '@/data/laundry-employees';
import { useLanguage } from '@/hooks';

type EmployeesOrgChartMobileProps = {
  chart: EmployeesOrgChart;
  cardIndexOffset?: number;
};

type AccordionSectionProps = {
  titleEn: string;
  titleAr: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

function AccordionSection({ titleEn, titleAr, defaultOpen = false, children }: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`org-accordion__section${isOpen ? ' org-accordion__section--open' : ''}`}>
      <button
        aria-expanded={isOpen}
        className="org-accordion__trigger"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <ChevronDown
          aria-hidden="true"
          className="org-accordion__chevron"
          strokeWidth={1.75}
        />
        <span className="org-accordion__trigger-text">
          <span className="org-accordion__trigger-ar">{titleAr}</span>
          <span className="org-accordion__trigger-en">{titleEn}</span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            animate={{ height: 'auto', opacity: 1 }}
            className="org-accordion__panel"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
          >
            <div className="org-accordion__panel-inner">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

type DepartmentAccordionProps = {
  department: StaffDepartmentGroup;
  onIndexAdvance: () => number;
};

function DepartmentAccordion({ department, onIndexAdvance }: DepartmentAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const count = department.employees.length;

  return (
    <div className={`org-accordion__department${isOpen ? ' org-accordion__department--open' : ''}`}>
      <button
        aria-expanded={isOpen}
        className="org-accordion__department-trigger"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <ChevronDown
          aria-hidden="true"
          className="org-accordion__department-chevron"
          strokeWidth={1.75}
        />
        <span className="org-accordion__department-label">
          <span className="org-accordion__department-label-en">{department.titleEn}</span>
          <span className="org-accordion__department-label-ar">{department.titleAr}</span>
          <span className="org-accordion__department-count">({count})</span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            animate={{ height: 'auto', opacity: 1 }}
            className="org-accordion__department-panel"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <div className="org-accordion__cards">
              {department.employees.map((employee) => (
                <OrgChartEmployeeCard
                  employee={employee}
                  index={onIndexAdvance()}
                  key={employee.id}
                  size="compact"
                />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function EmployeeCards({ employees, onIndexAdvance }: { employees: LaundryEmployee[]; onIndexAdvance: () => number }) {
  return (
    <div className="org-accordion__cards">
      {employees.map((employee) => (
        <OrgChartEmployeeCard
          employee={employee}
          index={onIndexAdvance()}
          key={employee.id}
          size="compact"
        />
      ))}
    </div>
  );
}

export function EmployeesOrgChartMobile({
  chart,
  cardIndexOffset = 0,
}: EmployeesOrgChartMobileProps) {
  const { t } = useLanguage();
  let cardIndex = cardIndexOffset;

  const nextIndex = () => {
    const current = cardIndex;
    cardIndex += 1;
    return current;
  };

  const activeDepartments = chart.staffDepartments.filter((department) => department.employees.length > 0);

  return (
    <div className="org-chart org-chart--mobile">
      {chart.director ? (
        <AccordionSection
          defaultOpen
          titleAr={t('employees.org.directorAr')}
          titleEn={t('employees.org.directorEn')}
        >
          <EmployeeCards employees={[chart.director]} onIndexAdvance={nextIndex} />
        </AccordionSection>
      ) : null}

      {chart.manager ? (
        <AccordionSection titleAr={t('employees.org.managersAr')} titleEn={t('employees.org.managersEn')}>
          <EmployeeCards employees={[chart.manager]} onIndexAdvance={nextIndex} />
        </AccordionSection>
      ) : null}

      {chart.seniorSupervisors.length > 0 ? (
        <AccordionSection
          titleAr={t('employees.org.seniorSupervisorsAr')}
          titleEn={t('employees.org.seniorSupervisorsEn')}
        >
          <EmployeeCards employees={chart.seniorSupervisors} onIndexAdvance={nextIndex} />
        </AccordionSection>
      ) : null}

      {chart.tailor ? (
        <AccordionSection titleAr={t('employees.org.tailorAr')} titleEn={t('employees.org.tailorEn')}>
          <EmployeeCards employees={[chart.tailor]} onIndexAdvance={nextIndex} />
        </AccordionSection>
      ) : null}

      {chart.shiftLeaders.length > 0 ? (
        <AccordionSection
          titleAr={t('employees.org.shiftLeadersAr')}
          titleEn={t('employees.org.shiftLeadersEn')}
        >
          <EmployeeCards employees={chart.shiftLeaders} onIndexAdvance={nextIndex} />
        </AccordionSection>
      ) : null}

      {activeDepartments.length > 0 ? (
        <AccordionSection titleAr={t('employees.org.staffAr')} titleEn={t('employees.org.staffEn')}>
          <div className="org-accordion__departments">
            {activeDepartments.map((department) => (
              <DepartmentAccordion
                department={department}
                key={department.id}
                onIndexAdvance={nextIndex}
              />
            ))}
          </div>
        </AccordionSection>
      ) : null}
    </div>
  );
}

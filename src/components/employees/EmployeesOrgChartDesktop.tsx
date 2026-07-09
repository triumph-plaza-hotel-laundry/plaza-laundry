import type { ReactNode } from 'react';
import { OrgChartEmployeeCard } from '@/components/employees/OrgChartEmployeeCard';
import type { EmployeesOrgChart } from '@/lib/employees-org-chart';
import { useLanguage } from '@/hooks';

type EmployeesOrgChartDesktopProps = {
  chart: EmployeesOrgChart;
  cardIndexOffset?: number;
};

function OrgConnector() {
  return (
    <div aria-hidden="true" className="org-chart__connector">
      <span className="org-chart__connector-line" />
      <span className="org-chart__connector-arrow">↓</span>
      <span className="org-chart__connector-line" />
    </div>
  );
}

function OrgLevelLabel({ labelEn, labelAr }: { labelEn: string; labelAr: string }) {
  return (
    <div className="org-chart__level-label">
      <p className="org-chart__level-label-en">{labelEn}</p>
      <p className="org-chart__level-label-ar">{labelAr}</p>
    </div>
  );
}

export function EmployeesOrgChartDesktop({
  chart,
  cardIndexOffset = 0,
}: EmployeesOrgChartDesktopProps) {
  const { t } = useLanguage();
  let cardIndex = cardIndexOffset;

  const nextIndex = () => {
    const current = cardIndex;
    cardIndex += 1;
    return current;
  };

  const sections: ReactNode[] = [];

  if (chart.director) {
    sections.push(
      <section className="org-chart__level org-chart__level--director" key="director">
        <OrgLevelLabel
          labelAr={t('employees.org.directorAr')}
          labelEn={t('employees.org.directorEn')}
        />
        <div className="org-chart__row org-chart__row--single">
          <OrgChartEmployeeCard employee={chart.director} index={nextIndex()} size="executive" />
        </div>
      </section>,
    );
  }

  if (chart.manager) {
    sections.push(<OrgConnector key="connector-manager" />);
    sections.push(
      <section className="org-chart__level org-chart__level--manager" key="manager">
        <OrgLevelLabel labelAr={t('employees.org.managersAr')} labelEn={t('employees.org.managersEn')} />
        <div className="org-chart__row org-chart__row--single">
          <OrgChartEmployeeCard employee={chart.manager} index={nextIndex()} size="executive" />
        </div>
      </section>,
    );
  }

  if (chart.assistantManagers.length > 0) {
    sections.push(<OrgConnector key="connector-assistant-managers" />);
    sections.push(
      <section className="org-chart__level org-chart__level--assistant-managers" key="assistant-managers">
        <OrgLevelLabel
          labelAr={t('employees.org.assistantManagersAr')}
          labelEn={t('employees.org.assistantManagersEn')}
        />
        <div className="org-chart__row org-chart__row--quad">
          {chart.assistantManagers.map((employee) => (
            <OrgChartEmployeeCard employee={employee} index={nextIndex()} key={employee.id} size="standard" />
          ))}
        </div>
      </section>,
    );
  }

  if (chart.seniorSupervisors.length > 0) {
    sections.push(<OrgConnector key="connector-senior" />);
    sections.push(
      <section className="org-chart__level org-chart__level--senior" key="senior">
        <OrgLevelLabel
          labelAr={t('employees.org.seniorSupervisorsAr')}
          labelEn={t('employees.org.seniorSupervisorsEn')}
        />
        <div className="org-chart__row org-chart__row--quad">
          {chart.seniorSupervisors.map((employee) => (
            <OrgChartEmployeeCard employee={employee} index={nextIndex()} key={employee.id} size="standard" />
          ))}
        </div>
      </section>,
    );
  }

  if (chart.leadSupervisors.length > 0) {
    sections.push(<OrgConnector key="connector-lead-supervisors" />);
    sections.push(
      <section className="org-chart__level org-chart__level--lead-supervisors" key="lead-supervisors">
        <OrgLevelLabel
          labelAr={t('employees.org.leadSupervisorsAr')}
          labelEn={t('employees.org.leadSupervisorsEn')}
        />
        <div className="org-chart__row org-chart__row--quad">
          {chart.leadSupervisors.map((employee) => (
            <OrgChartEmployeeCard employee={employee} index={nextIndex()} key={employee.id} size="standard" />
          ))}
        </div>
      </section>,
    );
  }

  if (chart.shiftLeaders.length > 0) {
    sections.push(<OrgConnector key="connector-shift-leaders" />);
    sections.push(
      <section className="org-chart__level org-chart__level--shift-leaders" key="shift-leaders">
        <OrgLevelLabel
          labelAr={t('employees.org.shiftLeadersAr')}
          labelEn={t('employees.org.shiftLeadersEn')}
        />
        <div className="org-chart__row org-chart__row--triple">
          {chart.shiftLeaders.map((employee) => (
            <OrgChartEmployeeCard employee={employee} index={nextIndex()} key={employee.id} size="standard" />
          ))}
        </div>
      </section>,
    );
  }

  if (chart.tailor) {
    sections.push(<OrgConnector key="connector-tailor" />);
    sections.push(
      <section className="org-chart__level org-chart__level--tailor" key="tailor">
        <OrgLevelLabel labelAr={t('employees.org.tailorAr')} labelEn={t('employees.org.tailorEn')} />
        <div className="org-chart__row org-chart__row--single">
          <OrgChartEmployeeCard employee={chart.tailor} index={nextIndex()} size="standard" />
        </div>
      </section>,
    );
  }

  const activeDepartments = chart.staffDepartments.filter((department) => department.employees.length > 0);

  if (activeDepartments.length > 0) {
    sections.push(<OrgConnector key="connector-staff" />);
    sections.push(
      <section className="org-chart__level org-chart__level--staff" key="staff">
        <OrgLevelLabel labelAr={t('employees.org.staffAr')} labelEn={t('employees.org.staffEn')} />
        <div className="org-chart__departments">
          {activeDepartments.map((department) => (
            <div className="org-chart__department" key={department.id}>
              <div className="org-chart__department-header">
                <p className="org-chart__department-title-en">{department.titleEn}</p>
                <p className="org-chart__department-title-ar">{department.titleAr}</p>
              </div>
              <div
                className="org-chart__department-grid"
                data-count={department.employees.length}
              >
                {department.employees.map((employee) => (
                  <OrgChartEmployeeCard
                    employee={employee}
                    index={nextIndex()}
                    key={employee.id}
                    size="compact"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>,
    );
  }

  return <div className="org-chart org-chart--desktop">{sections}</div>;
}

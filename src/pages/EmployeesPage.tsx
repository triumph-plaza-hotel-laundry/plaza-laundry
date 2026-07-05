import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EmployeesOrgChartDesktop } from '@/components/employees/EmployeesOrgChartDesktop';
import { EmployeesOrgChartMobile } from '@/components/employees/EmployeesOrgChartMobile';
import { OrgChartEmployeeCard } from '@/components/employees/OrgChartEmployeeCard';
import { useEmployees, useLanguage } from '@/hooks';
import { sortEmployeesForDisplay } from '@/lib/employee-roles';
import { buildEmployeesOrgChart, orgChartHasMembers } from '@/lib/employees-org-chart';
import '@/components/employees/employees-page.css';

export function EmployeesPage() {
  const { t } = useLanguage();
  const { employees } = useEmployees();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 480);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sorted = sortEmployeesForDisplay(employees);

    if (!query) {
      return sorted;
    }

    return sorted.filter((employee) => {
      const haystack = [
        employee.name.en,
        employee.name.ar,
        employee.employeeId,
        employee.jobTitle.en,
        employee.jobTitle.ar,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [employees, searchQuery]);

  const orgChart = useMemo(() => buildEmployeesOrgChart(filteredEmployees), [filteredEmployees]);
  const showOrgChart = !searchQuery.trim() && orgChartHasMembers(orgChart);

  return (
    <section className="employees-page mx-auto">
      <header className="employees-page__header">
        <div className="employees-page__title-block">
          <span aria-hidden="true" className="employees-page__emoji">
            ✦
          </span>
          <h1 className="employees-page__title-en">Employees</h1>
          <h1 className="employees-page__title-ar">الموظفون</h1>
          <p className="employees-page__subtitle-en">{t('employees.subtitle')}</p>
          <p className="employees-page__subtitle-ar">{t('employees.subtitleAr')}</p>
        </div>

        <label className="employees-page__search">
          <Search aria-hidden="true" className="employees-page__search-icon" strokeWidth={1.75} />
          <input
            className="employees-page__search-input"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('employees.searchPlaceholder')}
            type="search"
            value={searchQuery}
          />
        </label>

        <p className="employees-page__count">
          {t('employees.count').replace('{count}', String(filteredEmployees.length))}
        </p>
      </header>

      {isLoading ? (
        <div aria-busy="true" aria-label={t('employees.loading')} className="employees-page__loading">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="employee-card-skeleton" key={index} />
          ))}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="employees-page__empty">
          <p className="employees-page__empty-en">{t('employees.noResults')}</p>
          <p className="employees-page__empty-ar">{t('employees.noResultsAr')}</p>
        </div>
      ) : showOrgChart ? (
        <>
          <EmployeesOrgChartDesktop chart={orgChart} />
          <EmployeesOrgChartMobile chart={orgChart} />
        </>
      ) : (
        <div className="employees-search-results">
          {filteredEmployees.map((employee, index) => (
            <OrgChartEmployeeCard employee={employee} index={index} key={employee.id} size="compact" />
          ))}
        </div>
      )}
    </section>
  );
}

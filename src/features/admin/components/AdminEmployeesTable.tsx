import { Calendar, Pencil, Trash2 } from 'lucide-react';
import type { LaundryEmployee } from '@/data/repositories';
import {
  getEmployeeCode,
  getEmployeeStatus,
  getLocalizedDisplay,
} from '@/lib/employee-admin';
import {
  getBirthDateDisplayLabel,
  getEmployeeAge,
} from '@/lib/birthday-utils';
import { useCairoToday, useLanguage } from '@/hooks';

type AdminEmployeesTableProps = {
  employees: LaundryEmployee[];
  onDelete: (employee: LaundryEmployee) => void;
  onEdit: (employee: LaundryEmployee) => void;
};

export function AdminEmployeesTable({
  employees,
  onDelete,
  onEdit,
}: AdminEmployeesTableProps) {
  const { language, t } = useLanguage();
  const today = useCairoToday();
  const lang = language === 'ar' ? 'ar' : 'en';

  if (employees.length === 0) {
    return (
      <div className="admin-employees-dashboard__empty">
        <p>{t('admin.editor.employeesNoResults')}</p>
      </div>
    );
  }

  return (
    <div className="admin-employees-dashboard__table-wrap admin-editor-table-wrap">
      <table className="admin-editor-table admin-editor-table--responsive admin-employees-dashboard__table">
        <thead>
          <tr>
            <th scope="col">{t('admin.editor.table.employeeCode')}</th>
            <th scope="col">{t('admin.editor.table.nameAr')}</th>
            <th scope="col">{t('admin.editor.table.nameEn')}</th>
            <th scope="col">{t('admin.editor.table.department')}</th>
            <th scope="col">{t('admin.editor.table.position')}</th>
            <th scope="col">{t('admin.editor.table.phone')}</th>
            <th scope="col">{t('admin.editor.table.birthDate')}</th>
            <th scope="col">{t('admin.editor.table.shift')}</th>
            <th scope="col">{t('admin.editor.table.status')}</th>
            <th scope="col">{t('admin.editor.table.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => {
            const status = getEmployeeStatus(employee);
            const statusLabel =
              status === 'active'
                ? t('admin.editor.statusActive')
                : t('admin.editor.statusInactive');
            const birthDateLabel = getBirthDateDisplayLabel(
              employee.dateOfBirth,
            );
            const age = getEmployeeAge(employee.dateOfBirth, today);

            return (
              <tr key={employee.id}>
                <td data-label={t('admin.editor.table.employeeCode')}>
                  {getEmployeeCode(employee)}
                </td>
                <td data-label={t('admin.editor.table.nameAr')}>
                  {employee.name.ar || '—'}
                </td>
                <td data-label={t('admin.editor.table.nameEn')}>
                  {employee.name.en || '—'}
                </td>
                <td data-label={t('admin.editor.table.department')}>
                  {getLocalizedDisplay(employee.department, lang)}
                </td>
                <td data-label={t('admin.editor.table.position')}>
                  {getLocalizedDisplay(employee.jobTitle, lang)}
                </td>
                <td data-label={t('admin.editor.table.phone')}>
                  {employee.phone.trim() || '—'}
                </td>
                <td data-label={t('admin.editor.table.birthDate')}>
                  {birthDateLabel ? (
                    <span className="admin-employees-dashboard__dob">
                      <Calendar
                        aria-hidden="true"
                        className="admin-employees-dashboard__dob-icon"
                        strokeWidth={1.75}
                      />
                      <span>
                        {birthDateLabel}
                        {age !== null ? (
                          <span className="admin-employees-dashboard__dob-age">
                            {' '}
                            · {age} {t('employees.ageYears')}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td data-label={t('admin.editor.table.shift')}>
                  {getLocalizedDisplay(employee.shift, lang)}
                </td>
                <td data-label={t('admin.editor.table.status')}>
                  <span
                    className={`admin-employees-dashboard__status admin-employees-dashboard__status--${status}`}
                  >
                    {statusLabel}
                  </span>
                </td>
                <td data-label={t('admin.editor.table.actions')}>
                  <div className="admin-employees-dashboard__actions">
                    <button
                      className="admin-employees-dashboard__action-btn"
                      onClick={() => onEdit(employee)}
                      type="button"
                    >
                      <Pencil aria-hidden="true" size={14} strokeWidth={1.75} />
                      {t('admin.editor.edit')}
                    </button>
                    <button
                      className="admin-employees-dashboard__action-btn admin-employees-dashboard__action-btn--danger"
                      onClick={() => onDelete(employee)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={14} strokeWidth={1.75} />
                      {t('admin.editor.delete')}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

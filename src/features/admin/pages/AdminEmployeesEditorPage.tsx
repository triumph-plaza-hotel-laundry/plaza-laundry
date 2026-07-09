import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AdminEmployeeModal } from '@/features/admin/components/AdminEmployeeModal';
import { AdminEmployeesTable } from '@/features/admin/components/AdminEmployeesTable';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { employeesRepository, normalizeEmployee, type LaundryEmployee } from '@/data/repositories';
import { useAuth, useLanguage, useSyncStore } from '@/hooks';
import { sortEmployeesForAdminTable } from '@/lib/employee-org-hierarchy';
import {
  getEmployeeCode,
  getEmployeeStatus,
  getLocalizedDisplay,
  uniqueSorted,
} from '@/lib/employee-admin';
import '@/features/admin/admin-editor.css';

function emptyEmployee(sortOrder: number): LaundryEmployee {
  return normalizeEmployee({
    id: `emp-${Date.now()}`,
    employeeId: '',
    tier: 'laundryWorker',
    status: 'active',
    sortOrder,
  });
}

export function AdminEmployeesEditorPage() {
  const { language, t } = useLanguage();
  const { assertCan, logAction } = useAuth();
  const employees = useSyncStore(employeesRepository);
  const [draft, setDraft] = useState<LaundryEmployee | null>(null);
  const [isCreate, setIsCreate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LaundryEmployee | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const lang = language === 'ar' ? 'ar' : 'en';

  const departmentOptions = useMemo(
    () =>
      uniqueSorted(
        employees.flatMap((employee) => [employee.department.en, employee.department.ar]),
      ),
    [employees],
  );

  const positionOptions = useMemo(
    () =>
      uniqueSorted(employees.flatMap((employee) => [employee.jobTitle.en, employee.jobTitle.ar])),
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = [...employees]
      .filter((employee) => {
        if (departmentFilter !== 'all') {
          const department = getLocalizedDisplay(employee.department, lang);
          if (department !== departmentFilter) {
            return false;
          }
        }

        if (positionFilter !== 'all') {
          const position = getLocalizedDisplay(employee.jobTitle, lang);
          if (position !== positionFilter) {
            return false;
          }
        }

        if (statusFilter !== 'all' && getEmployeeStatus(employee) !== statusFilter) {
          return false;
        }

        if (!query) {
          return true;
        }

        const haystack = [
          getEmployeeCode(employee),
          employee.id,
          employee.name.en,
          employee.name.ar,
          employee.jobTitle.en,
          employee.jobTitle.ar,
          employee.department.en,
          employee.department.ar,
          employee.phone,
          employee.shift.en,
          employee.shift.ar,
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(query);
      });

    return sortEmployeesForAdminTable(filtered);
  }, [departmentFilter, employees, lang, positionFilter, searchQuery, statusFilter]);

  const showToast = (message: string, tone: 'success' | 'error') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  };

  const openEmployee = (employee: LaundryEmployee, create = false) => {
    setDraft(structuredClone(employee));
    setIsCreate(create);
  };

  const handleAdd = () => {
    const nextSortOrder = employees.reduce((max, employee) => Math.max(max, employee.sortOrder), 0) + 1;
    openEmployee(emptyEmployee(nextSortOrder), true);
  };

  const handleSave = async () => {
    if (!draft) {
      return;
    }

    setIsSaving(true);

    try {
      assertCan('employees', 'update');
      const exists = employees.some((employee) => employee.id === draft.id);
      const normalized = normalizeEmployee(draft);

      if (exists) {
        employeesRepository.update(normalized.id, normalized);
      } else {
        employeesRepository.create(normalized);
      }

      await employeesRepository.flush();
      logAction({
        action: exists ? 'employees.update' : 'employees.create',
        page: 'admin/employees',
        newValue: normalized,
      });
      setDraft(null);
      setIsCreate(false);
      showToast(t('admin.editor.saveSuccess'), 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('admin.editor.saveError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsSaving(true);

    try {
      assertCan('employees', 'delete');
      employeesRepository.remove(deleteTarget.id);
      await employeesRepository.flush();
      logAction({
        action: 'employees.delete',
        page: 'admin/employees',
        oldValue: deleteTarget,
      });
      setDeleteTarget(null);
      showToast(t('admin.editor.deleteSuccess'), 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('admin.editor.saveError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="admin-editor-page admin-employees-dashboard mx-auto">
      <div aria-hidden="true" className="admin-employees-dashboard__marble" />

      <AdminPageHeader
        subtitle={t('admin.editor.employeesSubtitle')}
        titleAr="إدارة الموظفين"
        titleEn="Manage Employees"
      />

      <div className="admin-employees-dashboard__toolbar">
        <div className="admin-employees-dashboard__toolbar-main">
          <div className="admin-employees-dashboard__filters">
            <label className="admin-employees-dashboard__filter">
              <span>{t('admin.editor.employeeSearch')}</span>
              <div className="admin-employees-dashboard__search">
                <Search aria-hidden="true" className="admin-employees-dashboard__search-icon" size={16} />
                <input
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t('admin.editor.employeeSearchPlaceholder')}
                  type="search"
                  value={searchQuery}
                />
              </div>
            </label>

            <label className="admin-employees-dashboard__filter">
              <span>{t('admin.editor.departmentFilter')}</span>
              <select onChange={(event) => setDepartmentFilter(event.target.value)} value={departmentFilter}>
                <option value="all">{t('admin.editor.allDepartments')}</option>
                {departmentOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-employees-dashboard__filter">
              <span>{t('admin.editor.positionFilter')}</span>
              <select onChange={(event) => setPositionFilter(event.target.value)} value={positionFilter}>
                <option value="all">{t('admin.editor.allPositions')}</option>
                {positionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-employees-dashboard__filter">
              <span>{t('admin.editor.statusFilter')}</span>
              <select
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')
                }
                value={statusFilter}
              >
                <option value="all">{t('admin.editor.allStatuses')}</option>
                <option value="active">{t('admin.editor.statusActive')}</option>
                <option value="inactive">{t('admin.editor.statusInactive')}</option>
              </select>
            </label>
          </div>
        </div>

        <button
          className="admin-employees-dashboard__add-btn"
          onClick={handleAdd}
          type="button"
        >
          <Plus aria-hidden="true" size={18} strokeWidth={1.75} />
          {t('admin.editor.addEmployee')}
        </button>
      </div>

      <div className="admin-employees-dashboard__panel">
        <div className="admin-employees-dashboard__panel-header">
          <p className="admin-employees-dashboard__panel-meta">
            {filteredEmployees.length} / {employees.length}
          </p>
        </div>

        <AdminEmployeesTable
          employees={filteredEmployees}
          onDelete={setDeleteTarget}
          onEdit={(employee) => openEmployee(employee)}
        />
      </div>

      <AdminEmployeeModal
        employee={draft}
        isCreate={isCreate}
        isOpen={Boolean(draft)}
        isSaving={isSaving}
        onCancel={() => {
          setDraft(null);
          setIsCreate(false);
        }}
        onChange={setDraft}
        onSave={() => void handleSave()}
      />

      <AnimatePresence>
        {deleteTarget ? (
          <>
            <motion.button
              aria-label={t('admin.editor.cancel')}
              className="admin-employee-modal__backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTarget(null)}
              type="button"
            />
            <div className="admin-employee-modal__viewport">
              <motion.div
                aria-modal="true"
                className="admin-employee-modal admin-employees-dashboard__confirm"
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                role="dialog"
              >
                <h3 className="admin-employees-dashboard__confirm-title">{t('admin.editor.delete')}</h3>
                <p className="admin-employees-dashboard__confirm-text">
                  {t('admin.editor.deleteConfirm').replace('{name}', getLocalizedDisplay(deleteTarget.name, lang))}
                </p>
                <div className="admin-employee-modal__actions admin-employee-modal__actions--save">
                  <button
                    className="admin-editor-btn"
                    disabled={isSaving}
                    onClick={() => setDeleteTarget(null)}
                    type="button"
                  >
                    {t('admin.editor.cancel')}
                  </button>
                  <button
                    className="admin-editor-btn admin-editor-btn--danger-solid"
                    disabled={isSaving}
                    onClick={() => void handleDelete()}
                    type="button"
                  >
                    {t('admin.editor.delete')}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toast ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={`admin-employees-dashboard__toast admin-employees-dashboard__toast--${toast.tone}`}
            exit={{ opacity: 0, y: 12 }}
            initial={{ opacity: 0, y: 12 }}
            role="status"
          >
            {toast.message}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

import { useState } from 'react';
import { Plus, UserRound } from 'lucide-react';
import { AdminEmployeeModal } from '@/features/admin/components/AdminEmployeeModal';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { employeesRepository, normalizeEmployee, type LaundryEmployee } from '@/data/repositories';
import { useAuth, useLanguage, useSyncStore } from '@/hooks';

function emptyEmployee(): LaundryEmployee {
  return normalizeEmployee({
    id: `emp-${Date.now()}`,
    employeeId: '',
    tier: 'laundryWorker',
  });
}

export function AdminEmployeesEditorPage() {
  const { t } = useLanguage();
  const { assertCan, logAction } = useAuth();
  const employees = useSyncStore(employeesRepository);
  const [draft, setDraft] = useState<LaundryEmployee | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveNoticeIsError, setSaveNoticeIsError] = useState(false);

  const openEmployee = (employee: LaundryEmployee) => {
    setDraft(structuredClone(employee));
    setSaveNotice(null);
    setSaveNoticeIsError(false);
  };

  const handleAdd = () => {
    const next = emptyEmployee();
    openEmployee(next);
  };

  const handleSave = async () => {
    if (!draft) {
      return;
    }

    setIsSaving(true);
    setSaveNotice(null);
    setSaveNoticeIsError(false);

    try {
      assertCan('employees', 'update');
      const exists = employees.some((employee) => employee.id === draft.id);

      if (exists) {
        employeesRepository.update(draft.id, draft);
      } else {
        employeesRepository.create(draft);
      }

      await employeesRepository.flush();
      logAction({
        action: exists ? 'employees.update' : 'employees.create',
        page: 'admin/employees',
        newValue: draft,
      });
      setSaveNotice(t('admin.editor.saveSuccess'));
      setDraft(null);
    } catch (error) {
      setSaveNotice(error instanceof Error ? error.message : t('admin.editor.saveError'));
      setSaveNoticeIsError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!draft) {
      return;
    }

    setIsSaving(true);
    setSaveNotice(null);
    setSaveNoticeIsError(false);

    try {
      assertCan('employees', 'delete');
      employeesRepository.remove(draft.id);
      await employeesRepository.flush();
      logAction({ action: 'employees.delete', page: 'admin/employees', oldValue: draft });
      setDraft(null);
      setSaveNotice(t('admin.editor.saveSuccess'));
    } catch (error) {
      setSaveNotice(error instanceof Error ? error.message : t('admin.editor.saveError'));
      setSaveNoticeIsError(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="admin-editor-page mx-auto">
      <AdminPageHeader
        subtitle={t('admin.editor.employeesSubtitle')}
        titleAr="إدارة الموظفين"
        titleEn="Manage Employees"
      />

      <div className="admin-editor-actions-row">
        <button className="admin-editor-btn" onClick={handleAdd} type="button">
          <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
          {t('admin.editor.add')}
        </button>
      </div>

      {saveNotice ? (
        <p className={`admin-editor-notice${saveNoticeIsError ? ' admin-editor-notice--error' : ''}`}>
          {saveNotice}
        </p>
      ) : null}

      <div className="admin-employee-cards">
        {employees.map((employee) => (
          <button
            aria-label={t('admin.editor.openEmployee')}
            className="admin-employee-card"
            key={employee.id}
            onClick={() => openEmployee(employee)}
            type="button"
          >
            <UserRound aria-hidden="true" className="admin-employee-card__icon" size={28} strokeWidth={1.4} />
          </button>
        ))}
      </div>

      <AdminEmployeeModal
        employee={draft}
        isOpen={Boolean(draft)}
        isSaving={isSaving}
        onCancel={() => setDraft(null)}
        onChange={setDraft}
        onDelete={() => void handleDelete()}
        onSave={() => void handleSave()}
      />
    </section>
  );
}

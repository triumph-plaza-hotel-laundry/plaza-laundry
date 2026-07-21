import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { EmployeeStatus, LaundryEmployee } from '@/data/repositories';
import { inferEmployeeTierFromPosition } from '@/lib/employee-org-hierarchy';
import {
  birthDateToIsoInputValue,
  getLocalizedBirthDate,
  localizedBirthDateFromIso,
} from '@/lib/birthday-utils';
import { useLanguage } from '@/hooks';

type AdminEmployeeModalProps = {
  employee: LaundryEmployee | null;
  isCreate: boolean;
  isOpen: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (next: LaundryEmployee) => void;
  onSave: () => void;
};

export function AdminEmployeeModal({
  employee,
  isCreate,
  isOpen,
  isSaving,
  onCancel,
  onChange,
  onSave,
}: AdminEmployeeModalProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onCancel]);

  if (!employee) {
    return null;
  }

  const birthDateInputValue = birthDateToIsoInputValue(
    getLocalizedBirthDate(employee.dateOfBirth).en,
  );

  const updatePositionEn = (value: string) => {
    onChange({
      ...employee,
      jobTitle: { ...employee.jobTitle, en: value },
      tier: inferEmployeeTierFromPosition(value, employee.tier),
    });
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.button
            aria-label={t('admin.editor.cancel')}
            className="admin-employee-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            type="button"
          />
          <div className="admin-employee-modal__viewport">
            <motion.div
              aria-labelledby="admin-employee-modal-title"
              aria-modal="true"
              className="admin-employee-modal"
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              role="dialog"
            >
              <header className="admin-employee-modal__header">
                <h2
                  className="admin-employee-modal__title"
                  id="admin-employee-modal-title"
                >
                  {isCreate
                    ? t('admin.editor.addEmployee')
                    : t('admin.editor.editEmployee')}
                </h2>
                <button
                  aria-label={t('admin.editor.cancel')}
                  className="admin-employee-modal__close"
                  onClick={onCancel}
                  type="button"
                >
                  <X aria-hidden="true" size={18} strokeWidth={1.75} />
                </button>
              </header>

              <div className="admin-employee-modal__grid">
                <div className="admin-editor-field">
                  <label>{t('admin.editor.employeeCode')}</label>
                  <input
                    onChange={(event) =>
                      onChange({ ...employee, employeeId: event.target.value })
                    }
                    value={employee.employeeId}
                  />
                </div>
                <div className="admin-editor-field">
                  <label>{t('admin.editor.status')}</label>
                  <select
                    onChange={(event) =>
                      onChange({
                        ...employee,
                        status: event.target.value as EmployeeStatus,
                      })
                    }
                    value={employee.status}
                  >
                    <option value="active">
                      {t('admin.editor.statusActive')}
                    </option>
                    <option value="inactive">
                      {t('admin.editor.statusInactive')}
                    </option>
                  </select>
                </div>
                <div className="admin-editor-field">
                  <label>{t('admin.editor.nameAr')}</label>
                  <input
                    onChange={(event) =>
                      onChange({
                        ...employee,
                        name: { ...employee.name, ar: event.target.value },
                      })
                    }
                    value={employee.name.ar}
                  />
                </div>
                <div className="admin-editor-field">
                  <label>{t('admin.editor.nameEn')}</label>
                  <input
                    onChange={(event) =>
                      onChange({
                        ...employee,
                        name: { ...employee.name, en: event.target.value },
                      })
                    }
                    value={employee.name.en}
                  />
                </div>
                <div className="admin-editor-field">
                  <label>{t('admin.editor.department')} (EN)</label>
                  <input
                    onChange={(event) =>
                      onChange({
                        ...employee,
                        department: {
                          ...employee.department,
                          en: event.target.value,
                        },
                      })
                    }
                    value={employee.department.en}
                  />
                </div>
                <div className="admin-editor-field">
                  <label>{t('admin.editor.department')} (AR)</label>
                  <input
                    onChange={(event) =>
                      onChange({
                        ...employee,
                        department: {
                          ...employee.department,
                          ar: event.target.value,
                        },
                      })
                    }
                    value={employee.department.ar}
                  />
                </div>
                <div className="admin-editor-field">
                  <label>{t('admin.editor.position')} (EN)</label>
                  <input
                    onChange={(event) => updatePositionEn(event.target.value)}
                    value={employee.jobTitle.en}
                  />
                </div>
                <div className="admin-editor-field">
                  <label>{t('admin.editor.position')} (AR)</label>
                  <input
                    onChange={(event) =>
                      onChange({
                        ...employee,
                        jobTitle: {
                          ...employee.jobTitle,
                          ar: event.target.value,
                        },
                      })
                    }
                    value={employee.jobTitle.ar}
                  />
                </div>
                <div className="admin-editor-field">
                  <label>{t('admin.editor.phone')}</label>
                  <input
                    onChange={(event) =>
                      onChange({ ...employee, phone: event.target.value })
                    }
                    type="tel"
                    value={employee.phone}
                  />
                </div>
                <div className="admin-editor-field">
                  <label>{t('admin.editor.dateOfBirth')}</label>
                  <input
                    onChange={(event) => {
                      const iso = event.target.value;
                      onChange({
                        ...employee,
                        dateOfBirth: iso
                          ? localizedBirthDateFromIso(iso)
                          : { en: '', ar: '' },
                      });
                    }}
                    type="date"
                    value={birthDateInputValue}
                  />
                </div>
                <div className="admin-editor-field">
                  <label>{t('admin.editor.shift')} (EN)</label>
                  <input
                    onChange={(event) =>
                      onChange({
                        ...employee,
                        shift: { ...employee.shift, en: event.target.value },
                      })
                    }
                    value={employee.shift.en}
                  />
                </div>
                <div className="admin-editor-field">
                  <label>{t('admin.editor.shift')} (AR)</label>
                  <input
                    onChange={(event) =>
                      onChange({
                        ...employee,
                        shift: { ...employee.shift, ar: event.target.value },
                      })
                    }
                    value={employee.shift.ar}
                  />
                </div>
              </div>

              <footer className="admin-employee-modal__actions admin-employee-modal__actions--save">
                <button
                  className="admin-editor-btn"
                  disabled={isSaving}
                  onClick={onCancel}
                  type="button"
                >
                  {t('admin.editor.cancel')}
                </button>
                <button
                  className="admin-editor-btn admin-editor-btn--primary admin-employees-dashboard__save-btn"
                  disabled={isSaving}
                  onClick={onSave}
                  type="button"
                >
                  {isSaving
                    ? t('admin.editor.saving')
                    : t('admin.editor.saveChanges')}
                </button>
              </footer>
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

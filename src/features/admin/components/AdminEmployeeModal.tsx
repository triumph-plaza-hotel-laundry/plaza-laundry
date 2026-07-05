import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { LaundryEmployee } from '@/data/repositories';
import { useLanguage } from '@/hooks';

type AdminEmployeeModalProps = {
  employee: LaundryEmployee | null;
  isOpen: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (next: LaundryEmployee) => void;
  onDelete: () => void;
  onSave: () => void;
};

export function AdminEmployeeModal({
  employee,
  isOpen,
  isSaving,
  onCancel,
  onChange,
  onDelete,
  onSave,
}: AdminEmployeeModalProps) {
  const { language, t } = useLanguage();

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

  const lang = language === 'ar' ? 'ar' : 'en';

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
              <h2 className="admin-employee-modal__title" id="admin-employee-modal-title">
                {t('admin.editor.employeeDetails')}
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
                <label>{t('admin.editor.nameEn')}</label>
                <input
                  onChange={(event) =>
                    onChange({ ...employee, name: { ...employee.name, en: event.target.value } })
                  }
                  value={employee.name.en}
                />
              </div>
              <div className="admin-editor-field">
                <label>{t('admin.editor.nameAr')}</label>
                <input
                  onChange={(event) =>
                    onChange({ ...employee, name: { ...employee.name, ar: event.target.value } })
                  }
                  value={employee.name.ar}
                />
              </div>
              <div className="admin-editor-field">
                <label>{t('admin.editor.position')}</label>
                <input
                  onChange={(event) =>
                    onChange({
                      ...employee,
                      jobTitle: { ...employee.jobTitle, [lang]: event.target.value },
                    })
                  }
                  value={employee.jobTitle[lang]}
                />
              </div>
              <div className="admin-editor-field">
                <label>{t('admin.editor.phone')}</label>
                <input
                  onChange={(event) => onChange({ ...employee, phone: event.target.value })}
                  value={employee.phone}
                />
              </div>
              <div className="admin-editor-field">
                <label>{t('admin.editor.department')}</label>
                <input
                  onChange={(event) =>
                    onChange({
                      ...employee,
                      department: { ...employee.department, [lang]: event.target.value },
                    })
                  }
                  value={employee.department[lang]}
                />
              </div>
              <div className="admin-editor-field">
                <label>{t('admin.editor.shift')}</label>
                <input
                  onChange={(event) =>
                    onChange({
                      ...employee,
                      shift: { ...employee.shift, [lang]: event.target.value },
                    })
                  }
                  value={employee.shift[lang]}
                />
              </div>
              <div className="admin-editor-field">
                <label>{t('admin.editor.salary')}</label>
                <input
                  onChange={(event) => onChange({ ...employee, salary: event.target.value })}
                  value={employee.salary}
                />
              </div>
              <div className="admin-editor-field">
                <label>{t('admin.editor.hireDate')}</label>
                <input
                  onChange={(event) =>
                    onChange({
                      ...employee,
                      hireDate: { ...employee.hireDate, [lang]: event.target.value },
                    })
                  }
                  value={employee.hireDate[lang]}
                />
              </div>
              <div className="admin-editor-field admin-editor-field--wide">
                <label>{t('admin.editor.notes')}</label>
                <textarea
                  onChange={(event) =>
                    onChange({
                      ...employee,
                      notes: { ...employee.notes, [lang]: event.target.value },
                    })
                  }
                  rows={3}
                  value={employee.notes[lang]}
                />
              </div>
            </div>

            <footer className="admin-employee-modal__actions">
              <button
                className="admin-editor-btn admin-editor-btn--danger"
                disabled={isSaving}
                onClick={onDelete}
                type="button"
              >
                {t('admin.editor.delete')}
              </button>
              <button className="admin-editor-btn" disabled={isSaving} onClick={onCancel} type="button">
                {t('admin.editor.cancel')}
              </button>
              <button
                className="admin-editor-btn admin-editor-btn--primary"
                disabled={isSaving}
                onClick={onSave}
                type="button"
              >
                {isSaving ? t('admin.editor.saving') : t('admin.editor.save')}
              </button>
            </footer>
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

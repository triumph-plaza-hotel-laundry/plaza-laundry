import { Save, X } from 'lucide-react';
import { useLanguage } from '@/hooks';
import '@/features/admin/admin-editor.css';

type AdminEditToolbarProps = {
  isDirty: boolean;
  isSaving?: boolean;
  notice?: string | null;
  noticeIsError?: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export function AdminEditToolbar({
  isDirty,
  isSaving = false,
  notice,
  noticeIsError = false,
  onSave,
  onCancel,
}: AdminEditToolbarProps) {
  const { t } = useLanguage();

  const hint = notice ?? (isDirty ? t('admin.editor.unsavedChanges') : t('admin.editor.allSaved'));

  return (
    <div className="admin-edit-toolbar" role="toolbar">
      <p
        className={
          notice && !noticeIsError
            ? 'admin-edit-toolbar__hint admin-settings-message admin-settings-message--success'
            : 'admin-edit-toolbar__hint'
        }
      >
        {hint}
      </p>
      <div className="admin-edit-toolbar__actions">
        <button
          className="admin-edit-toolbar__btn admin-edit-toolbar__btn--cancel"
          disabled={!isDirty || isSaving}
          onClick={onCancel}
          type="button"
        >
          <X aria-hidden="true" size={16} />
          {t('admin.editor.cancel')}
        </button>
        <button
          className="admin-edit-toolbar__btn admin-edit-toolbar__btn--save"
          disabled={!isDirty || isSaving}
          onClick={onSave}
          type="button"
        >
          <Save aria-hidden="true" size={16} />
          {isSaving ? t('admin.editor.saving') : t('admin.editor.save')}
        </button>
      </div>
    </div>
  );
}

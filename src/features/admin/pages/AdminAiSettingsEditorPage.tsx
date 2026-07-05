import { useState } from 'react';
import { AdminEditToolbar } from '@/features/admin/components/AdminEditToolbar';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { useDraftState } from '@/features/admin/hooks/useDraftState';
import { aiSettingsRepository } from '@/data/repositories';
import { useAuth, useLanguage } from '@/hooks';
import '@/features/admin/admin-editor.css';

export function AdminAiSettingsEditorPage() {
  const { t } = useLanguage();
  const { assertCan, logAction } = useAuth();
  const { draft, isDirty, setDraft, resetDraft, commitDraft } = useDraftState(aiSettingsRepository);
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveNoticeIsError, setSaveNoticeIsError] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveNotice(null);
    setSaveNoticeIsError(false);
    try {
      assertCan('admin', 'update');
      await commitDraft(async (value) => {
        await aiSettingsRepository.replaceAll(value);
        logAction({ action: 'aiSettings.replaceAll', page: 'admin/ai', newValue: value });
      });
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
        subtitle={t('admin.dashboard.aiSettingsDesc')}
        titleAr="إعدادات الذكاء الاصطناعي"
        titleEn="AI Settings"
      />
      <AdminEditToolbar
        isDirty={isDirty}
        isSaving={isSaving}
        notice={saveNotice}
        noticeIsError={saveNoticeIsError}
        onCancel={resetDraft}
        onSave={() => void handleSave()}
      />

      <div className="admin-editor-panel admin-editor-grid">
        <div className="admin-editor-field">
          <label>{t('admin.editor.aiEnabled')}</label>
          <input
            checked={draft.enabled}
            onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })}
            type="checkbox"
          />
        </div>
        <div className="admin-editor-field">
          <label>{t('admin.editor.aiAssistantName')}</label>
          <input
            onChange={(event) => setDraft({ ...draft, assistantName: event.target.value })}
            value={draft.assistantName}
          />
        </div>
        <div className="admin-editor-field">
          <label>{t('admin.editor.aiModel')}</label>
          <input
            onChange={(event) => setDraft({ ...draft, model: event.target.value })}
            value={draft.model}
          />
        </div>
        <div className="admin-editor-field">
          <label>{t('admin.editor.aiSystemPrompt')}</label>
          <textarea
            onChange={(event) => setDraft({ ...draft, systemPrompt: event.target.value })}
            rows={8}
            value={draft.systemPrompt}
          />
        </div>
      </div>
    </section>
  );
}

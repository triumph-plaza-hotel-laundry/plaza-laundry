import { useState } from 'react';
import { AdminEditToolbar } from '@/features/admin/components/AdminEditToolbar';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { useDraftState } from '@/features/admin/hooks/useDraftState';
import { homeContentRepository } from '@/data/repositories';
import { useAuth, useLanguage } from '@/hooks';
import '@/features/admin/admin-editor.css';

function parseFeaturedIds(value: string): string[] {
  return value
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

export function AdminHomeContentEditorPage() {
  const { t } = useLanguage();
  const { assertCan, logAction } = useAuth();
  const { draft, isDirty, setDraft, resetDraft, commitDraft } = useDraftState(
    homeContentRepository,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveNoticeIsError, setSaveNoticeIsError] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveNotice(null);
    setSaveNoticeIsError(false);
    try {
      assertCan('dashboard', 'update');
      await commitDraft(async (value) => {
        await homeContentRepository.replaceAll(value);
        logAction({
          action: 'homeContent.replaceAll',
          page: 'admin/home',
          newValue: value,
        });
      });
      setSaveNotice(t('admin.editor.saveSuccess'));
    } catch (error) {
      setSaveNotice(
        error instanceof Error ? error.message : t('admin.editor.saveError'),
      );
      setSaveNoticeIsError(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="admin-editor-page mx-auto">
      <AdminPageHeader
        subtitle={t('admin.editor.homeContentSubtitle')}
        titleAr="إدارة الصفحة الرئيسية"
        titleEn="Manage Home Content"
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
          <label>{t('admin.editor.sloganEn')}</label>
          <input
            onChange={(event) =>
              setDraft({
                ...draft,
                slogan: { ...draft.slogan, en: event.target.value },
              })
            }
            value={draft.slogan.en}
          />
        </div>
        <div className="admin-editor-field">
          <label>{t('admin.editor.sloganAr')}</label>
          <input
            onChange={(event) =>
              setDraft({
                ...draft,
                slogan: { ...draft.slogan, ar: event.target.value },
              })
            }
            value={draft.slogan.ar}
          />
        </div>
        <div className="admin-editor-field">
          <label>{t('admin.editor.featuredFabrics')}</label>
          <textarea
            onChange={(event) =>
              setDraft({
                ...draft,
                featuredFabricIds: parseFeaturedIds(event.target.value),
              })
            }
            placeholder="cotton, linen, silk"
            rows={4}
            value={draft.featuredFabricIds.join(', ')}
          />
        </div>
      </div>
    </section>
  );
}

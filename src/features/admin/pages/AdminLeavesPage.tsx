import { useState } from 'react';
import { AdminBackButton } from '@/features/admin/components/AdminBackButton';
import { AdminEditToolbar } from '@/features/admin/components/AdminEditToolbar';
import { AdminLeavePanel } from '@/features/admin/components/AdminLeavePanel';
import { useDraftState } from '@/features/admin/hooks/useDraftState';
import { leavesRepository } from '@/data/repositories';
import { useAuth, useLanguage } from '@/hooks';
import '@/features/admin/admin-leaves-page.css';

export function AdminLeavesPage() {
  const { t } = useLanguage();
  const { assertCan, logAction, user } = useAuth();
  const { draft, isDirty, setDraft, resetDraft, commitDraft } = useDraftState(leavesRepository);
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveNoticeIsError, setSaveNoticeIsError] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveNotice(null);
    setSaveNoticeIsError(false);
    try {
      assertCan('leaves', 'update');
      await commitDraft(async (value) => {
        await leavesRepository.replaceAll(value);
        logAction({ action: 'leaves.replaceAll', page: 'admin/leaves', newValue: value });
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
    <section className="admin-leaves-page mx-auto">
      <div className="admin-page-header__back-row">
        <AdminBackButton />
      </div>
      <header className="admin-leaves-page__header">
        <span aria-hidden="true" className="admin-leaves-page__emoji">
          ✦
        </span>
        <h1 className="admin-leaves-page__title">{t('admin.leaves.pageTitle')}</h1>
        <p className="admin-leaves-page__subtitle">{t('admin.editor.leavesSubtitle')}</p>
      </header>

      <AdminEditToolbar
        isDirty={isDirty}
        isSaving={isSaving}
        notice={saveNotice}
        noticeIsError={saveNoticeIsError}
        onCancel={resetDraft}
        onSave={() => void handleSave()}
      />

      <AdminLeavePanel
        actorId={user?.id}
        actorName={user?.displayName || user?.username || 'Admin'}
        draft={draft}
        onDraftChange={setDraft}
      />
    </section>
  );
}

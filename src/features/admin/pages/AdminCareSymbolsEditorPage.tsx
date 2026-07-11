import { useMemo, useState } from 'react';
import { AdminEditToolbar } from '@/features/admin/components/AdminEditToolbar';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { useDraftState } from '@/features/admin/hooks/useDraftState';
import {
  careSymbolsRepository,
  type CareLabel,
  type CareSymbolCategory,
} from '@/data/repositories';
import { useAuth, useLanguage } from '@/hooks';
import '@/features/admin/admin-editor.css';

function emptyCareLabel(): CareLabel {
  return {
    id: `care-${Date.now()}`,
    name: { en: '', ar: '' },
    graphic: 'machine-wash',
    category: 'washing',
    meaning: { en: '', ar: '' },
    instructions: { en: '', ar: '' },
    recommendedFabrics: { en: '', ar: '' },
    warnings: { en: '', ar: '' },
    hotelNotes: { en: '', ar: '' },
  };
}

export function AdminCareSymbolsEditorPage() {
  const { t } = useLanguage();
  const { assertCan, logAction } = useAuth();
  const { draft, isDirty, setDraft, resetDraft, commitDraft } = useDraftState(
    careSymbolsRepository,
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    draft[0]?.id ?? null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveNoticeIsError, setSaveNoticeIsError] = useState(false);

  const selected = useMemo(
    () => draft.find((label) => label.id === selectedId) ?? null,
    [draft, selectedId],
  );

  const updateSelected = (patch: Partial<CareLabel>) => {
    if (!selected) {
      return;
    }

    setDraft(
      draft.map((label) =>
        label.id === selected.id ? { ...label, ...patch } : label,
      ),
    );
  };

  const updateLocalized = (
    field: keyof Pick<
      CareLabel,
      | 'name'
      | 'meaning'
      | 'instructions'
      | 'recommendedFabrics'
      | 'warnings'
      | 'hotelNotes'
    >,
    lang: 'en' | 'ar',
    value: string,
  ) => {
    if (!selected) {
      return;
    }

    updateSelected({ [field]: { ...selected[field], [lang]: value } });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveNotice(null);
    setSaveNoticeIsError(false);
    try {
      assertCan('careSymbols', 'update');
      await commitDraft(async (value) => {
        await careSymbolsRepository.replaceAll(value);
        logAction({
          action: 'careSymbols.replaceAll',
          page: 'admin/care-symbols',
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
        subtitle={t('admin.editor.careSymbolsSubtitle')}
        titleAr="إدارة علامات العناية"
        titleEn="Manage Care Labels"
      />
      <AdminEditToolbar
        isDirty={isDirty}
        isSaving={isSaving}
        notice={saveNotice}
        noticeIsError={saveNoticeIsError}
        onCancel={resetDraft}
        onSave={() => void handleSave()}
      />

      <div className="admin-editor-grid admin-editor-grid--2">
        <div className="admin-editor-panel">
          <div className="admin-editor-actions-row">
            <button
              className="admin-editor-btn"
              onClick={() => {
                const next = emptyCareLabel();
                setDraft([next, ...draft]);
                setSelectedId(next.id);
              }}
              type="button"
            >
              {t('admin.editor.add')}
            </button>
            <button
              className="admin-editor-btn admin-editor-btn--danger"
              disabled={!selected}
              onClick={() => {
                if (!selected) return;
                setDraft(draft.filter((label) => label.id !== selected.id));
                setSelectedId(
                  draft.find((label) => label.id !== selected.id)?.id ?? null,
                );
              }}
              type="button"
            >
              {t('admin.editor.delete')}
            </button>
          </div>
          <table className="admin-editor-table">
            <tbody>
              {draft.map((label) => (
                <tr key={label.id}>
                  <td>
                    <button
                      className="admin-editor-btn"
                      onClick={() => setSelectedId(label.id)}
                      type="button"
                    >
                      {label.name.en || label.id}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected ? (
          <div className="admin-editor-panel admin-editor-grid">
            <div className="admin-editor-field">
              <label>category</label>
              <select
                onChange={(event) =>
                  updateSelected({
                    category: event.target.value as CareSymbolCategory,
                  })
                }
                value={selected.category}
              >
                {(
                  [
                    'washing',
                    'bleaching',
                    'drying',
                    'ironing',
                    'dryCleaning',
                  ] as CareSymbolCategory[]
                ).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            {(
              ['name', 'meaning', 'instructions', 'recommendedFabrics'] as const
            ).flatMap((field) =>
              (['en', 'ar'] as const).map((lang) => (
                <div className="admin-editor-field" key={`${field}-${lang}`}>
                  <label>
                    {field} ({lang.toUpperCase()})
                  </label>
                  <textarea
                    onChange={(event) =>
                      updateLocalized(field, lang, event.target.value)
                    }
                    rows={3}
                    value={selected[field][lang]}
                  />
                </div>
              )),
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

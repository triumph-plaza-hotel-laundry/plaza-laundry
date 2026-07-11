import { useMemo, useState } from 'react';
import { AdminEditToolbar } from '@/features/admin/components/AdminEditToolbar';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { useDraftState } from '@/features/admin/hooks/useDraftState';
import {
  stainsRepository,
  type LaundryStain,
  type StainCategory,
  type StainDifficulty,
} from '@/data/repositories';
import { useAuth, useLanguage } from '@/hooks';
import '@/features/admin/admin-editor.css';

function emptyStain(): LaundryStain {
  return {
    id: `stain-${Date.now()}`,
    name: { en: '', ar: '' },
    icon: 'coffee',
    difficulty: 'medium',
    category: 'beverage',
    description: { en: '', ar: '' },
    recommendedChemical: { en: '', ar: '' },
    recommendedProgram: { en: '', ar: '' },
    washTemperature: { en: '', ar: '' },
    fabricCompatibility: { en: '', ar: '' },
    removalSteps: { en: '', ar: '' },
    warnings: { en: '', ar: '' },
    hotelRecommendations: { en: '', ar: '' },
  };
}

export function AdminStainsEditorPage() {
  const { t } = useLanguage();
  const { assertCan, logAction } = useAuth();
  const { draft, isDirty, setDraft, resetDraft, commitDraft } =
    useDraftState(stainsRepository);
  const [selectedId, setSelectedId] = useState<string | null>(
    draft[0]?.id ?? null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveNoticeIsError, setSaveNoticeIsError] = useState(false);

  const selected = useMemo(
    () => draft.find((stain) => stain.id === selectedId) ?? null,
    [draft, selectedId],
  );

  const updateSelected = (patch: Partial<LaundryStain>) => {
    if (!selected) {
      return;
    }

    setDraft(
      draft.map((stain) =>
        stain.id === selected.id ? { ...stain, ...patch } : stain,
      ),
    );
  };

  const updateLocalized = (
    field: keyof Pick<
      LaundryStain,
      | 'name'
      | 'description'
      | 'recommendedChemical'
      | 'recommendedProgram'
      | 'washTemperature'
      | 'fabricCompatibility'
      | 'removalSteps'
      | 'warnings'
      | 'hotelRecommendations'
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
      assertCan('stains', 'update');
      await commitDraft(async (value) => {
        await stainsRepository.replaceAll(value);
        logAction({
          action: 'stains.replaceAll',
          page: 'admin/stains',
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
        subtitle={t('admin.editor.stainsSubtitle')}
        titleAr="إدارة البقع"
        titleEn="Manage Stains"
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
                const next = emptyStain();
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
                setDraft(draft.filter((stain) => stain.id !== selected.id));
                setSelectedId(
                  draft.find((stain) => stain.id !== selected.id)?.id ?? null,
                );
              }}
              type="button"
            >
              {t('admin.editor.delete')}
            </button>
          </div>
          <table className="admin-editor-table">
            <tbody>
              {draft.map((stain) => (
                <tr key={stain.id}>
                  <td>
                    <button
                      className="admin-editor-btn"
                      onClick={() => setSelectedId(stain.id)}
                      type="button"
                    >
                      {stain.name.en || stain.id}
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
                    category: event.target.value as StainCategory,
                  })
                }
                value={selected.category}
              >
                {(
                  [
                    'beverage',
                    'food',
                    'body',
                    'oilFat',
                    'cosmetic',
                    'outdoor',
                    'industrial',
                    'household',
                    'chemical',
                  ] as StainCategory[]
                ).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-editor-field">
              <label>difficulty</label>
              <select
                onChange={(event) =>
                  updateSelected({
                    difficulty: event.target.value as StainDifficulty,
                  })
                }
                value={selected.difficulty}
              >
                {(
                  ['easy', 'medium', 'hard', 'expert'] as StainDifficulty[]
                ).map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
            {(
              [
                'name',
                'description',
                'recommendedChemical',
                'recommendedProgram',
              ] as const
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
                    rows={field === 'description' ? 3 : 2}
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

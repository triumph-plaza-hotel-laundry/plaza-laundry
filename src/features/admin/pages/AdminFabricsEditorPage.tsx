import { useMemo, useState } from 'react';
import { AdminEditToolbar } from '@/features/admin/components/AdminEditToolbar';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { useDraftState } from '@/features/admin/hooks/useDraftState';
import { fabricsRepository, type LaundryFabric } from '@/data/repositories';
import { useAuth, useLanguage } from '@/hooks';
import '@/features/admin/admin-editor.css';

function emptyFabric(): LaundryFabric {
  return {
    id: `fabric-${Date.now()}`,
    name: { en: '', ar: '' },
    image: '/fabrics/fabric.svg',
    fabricType: { en: '', ar: '' },
    characteristics: { en: '', ar: '' },
    washTemperature: { en: '', ar: '' },
    washingProgram: { en: '', ar: '' },
    dryingMethod: { en: '', ar: '' },
    ironTemperature: { en: '', ar: '' },
    bleachAllowed: false,
    dryCleaning: false,
    specialCare: { en: '', ar: '' },
    hotelUses: { en: '', ar: '' },
    categories: ['natural'],
  };
}

export function AdminFabricsEditorPage() {
  const { t } = useLanguage();
  const { assertCan, logAction } = useAuth();
  const { draft, isDirty, setDraft, resetDraft, commitDraft } = useDraftState(fabricsRepository);
  const [selectedId, setSelectedId] = useState<string | null>(draft[0]?.id ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveNoticeIsError, setSaveNoticeIsError] = useState(false);

  const selected = useMemo(
    () => draft.find((fabric) => fabric.id === selectedId) ?? null,
    [draft, selectedId],
  );

  const updateSelected = (patch: Partial<LaundryFabric>) => {
    if (!selected) {
      return;
    }

    setDraft(draft.map((fabric) => (fabric.id === selected.id ? { ...fabric, ...patch } : fabric)));
  };

  const updateLocalized = (
    field: 'name' | 'fabricType' | 'characteristics' | 'washTemperature' | 'washingProgram',
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
      assertCan('fabrics', 'update');
      await commitDraft(async (value) => {
        await fabricsRepository.replaceAll(value);
        logAction({ action: 'fabrics.replaceAll', page: 'admin/fabrics', newValue: value });
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
        subtitle={t('admin.editor.fabricsSubtitle')}
        titleAr="إدارة الأقمشة"
        titleEn="Manage Fabrics"
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
                const next = emptyFabric();
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
                setDraft(draft.filter((fabric) => fabric.id !== selected.id));
                setSelectedId(draft.find((fabric) => fabric.id !== selected.id)?.id ?? null);
              }}
              type="button"
            >
              {t('admin.editor.delete')}
            </button>
          </div>
          <table className="admin-editor-table">
            <tbody>
              {draft.map((fabric) => (
                <tr key={fabric.id}>
                  <td>
                    <button
                      className="admin-editor-btn"
                      onClick={() => setSelectedId(fabric.id)}
                      type="button"
                    >
                      {fabric.name.en || fabric.id}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected ? (
          <div className="admin-editor-panel admin-editor-grid">
            {(['name', 'fabricType', 'characteristics', 'washTemperature', 'washingProgram'] as const).flatMap(
              (field) =>
                (['en', 'ar'] as const).map((lang) => (
                  <div className="admin-editor-field" key={`${field}-${lang}`}>
                    <label>
                      {field} ({lang.toUpperCase()})
                    </label>
                    <input
                      onChange={(event) => updateLocalized(field, lang, event.target.value)}
                      value={selected[field][lang]}
                    />
                  </div>
                )),
            )}
            <div className="admin-editor-field">
              <label>bleachAllowed</label>
              <input
                checked={selected.bleachAllowed}
                onChange={(event) => updateSelected({ bleachAllowed: event.target.checked })}
                type="checkbox"
              />
            </div>
            <div className="admin-editor-field">
              <label>dryCleaning</label>
              <input
                checked={selected.dryCleaning}
                onChange={(event) => updateSelected({ dryCleaning: event.target.checked })}
                type="checkbox"
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

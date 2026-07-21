import { useMemo, useState } from 'react';
import { AdminEditToolbar } from '@/features/admin/components/AdminEditToolbar';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { useDraftState } from '@/features/admin/hooks/useDraftState';
import { chemicalsRepository, type LaundryChemical } from '@/data/repositories';
import type { ChemicalTechnicalRow } from '@/data/laundry-chemicals';
import { useAuth, useLanguage } from '@/hooks';
import '@/features/admin/admin-editor.css';

function linesToList(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(items: readonly string[]): string {
  return items.join('\n');
}

function emptyChemical(): LaundryChemical {
  return {
    id: Date.now(),
    productCode: '',
    brand: '',
    name: { en: '', ar: '' },
    image: '/chemicals/product.svg',
    category: { en: '', ar: '' },
    description: { en: '', ar: '' },
    howItWorks: { en: '', ar: '' },
    features: { en: [], ar: [] },
    usage: { en: '', ar: '' },
    dosage: { en: '', ar: '' },
    warnings: { en: [], ar: [] },
    safety: { en: '', ar: '' },
    storage: { en: '', ar: '' },
    technicalInfo: [],
    technicalFooterNote: { en: '', ar: '' },
  };
}

function emptyTechnicalRow(): ChemicalTechnicalRow {
  return {
    key: `row-${Date.now()}`,
    label: { en: '', ar: '' },
    value: { en: '', ar: '' },
  };
}

export function AdminChemicalsEditorPage() {
  const { t } = useLanguage();
  const { assertCan, logAction } = useAuth();
  const { draft, isDirty, setDraft, resetDraft, commitDraft } =
    useDraftState(chemicalsRepository);
  const [selectedId, setSelectedId] = useState<number | null>(
    draft[0]?.id ?? null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveNoticeIsError, setSaveNoticeIsError] = useState(false);

  const selected = useMemo(
    () => draft.find((chemical) => chemical.id === selectedId) ?? null,
    [draft, selectedId],
  );

  const updateSelected = (patch: Partial<LaundryChemical>) => {
    if (!selected) {
      return;
    }

    setDraft(
      draft.map((chemical) =>
        chemical.id === selected.id ? { ...chemical, ...patch } : chemical,
      ),
    );
  };

  const updateLocalized = (
    field:
      | 'name'
      | 'category'
      | 'description'
      | 'howItWorks'
      | 'usage'
      | 'dosage'
      | 'safety'
      | 'storage'
      | 'technicalFooterNote',
    lang: 'en' | 'ar',
    value: string,
  ) => {
    if (!selected) {
      return;
    }

    updateSelected({ [field]: { ...selected[field], [lang]: value } });
  };

  const updateTechnicalRow = (
    key: string,
    patch: Partial<ChemicalTechnicalRow>,
  ) => {
    if (!selected) {
      return;
    }

    updateSelected({
      technicalInfo: selected.technicalInfo.map((row) =>
        row.key === key ? { ...row, ...patch } : row,
      ),
    });
  };

  const updateTechnicalLocalized = (
    key: string,
    field: 'label' | 'value',
    lang: 'en' | 'ar',
    value: string,
  ) => {
    if (!selected) {
      return;
    }

    const row = selected.technicalInfo.find((entry) => entry.key === key);
    if (!row) {
      return;
    }

    updateTechnicalRow(key, {
      [field]: { ...row[field], [lang]: value },
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveNotice(null);
    setSaveNoticeIsError(false);
    try {
      assertCan('chemicals', 'update');
      await commitDraft(async (value) => {
        await chemicalsRepository.replaceAll(value);
        logAction({
          action: 'chemicals.replaceAll',
          page: 'admin/chemicals',
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
        subtitle={t('admin.editor.chemicalsSubtitle')}
        titleAr="إدارة المواد الكيميائية"
        titleEn="Manage Chemicals"
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
                const next = emptyChemical();
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
                setDraft(
                  draft.filter((chemical) => chemical.id !== selected.id),
                );
                setSelectedId(
                  draft.find((chemical) => chemical.id !== selected.id)?.id ??
                    null,
                );
              }}
              type="button"
            >
              {t('admin.editor.delete')}
            </button>
          </div>
          <table className="admin-editor-table">
            <tbody>
              {draft.map((chemical) => (
                <tr key={chemical.id}>
                  <td>
                    <button
                      className="admin-editor-btn"
                      onClick={() => setSelectedId(chemical.id)}
                      type="button"
                    >
                      {chemical.name.en || `#${chemical.id}`}
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
              <label htmlFor="chemical-product-code">productCode</label>
              <input
                id="chemical-product-code"
                onChange={(event) =>
                  updateSelected({ productCode: event.target.value })
                }
                value={selected.productCode}
              />
            </div>
            <div className="admin-editor-field">
              <label htmlFor="chemical-brand">brand</label>
              <input
                id="chemical-brand"
                onChange={(event) =>
                  updateSelected({ brand: event.target.value })
                }
                value={selected.brand}
              />
            </div>
            <div className="admin-editor-field">
              <label htmlFor="chemical-image">image</label>
              <input
                id="chemical-image"
                onChange={(event) =>
                  updateSelected({ image: event.target.value })
                }
                value={selected.image}
              />
            </div>
            {(
              [
                'name',
                'category',
                'description',
                'howItWorks',
                'usage',
                'dosage',
                'safety',
                'storage',
                'technicalFooterNote',
              ] as const
            ).flatMap((field) =>
              (['en', 'ar'] as const).map((lang) => (
                <div className="admin-editor-field" key={`${field}-${lang}`}>
                  <label>
                    {field} ({lang.toUpperCase()})
                  </label>
                  {field === 'name' || field === 'category' ? (
                    <input
                      onChange={(event) =>
                        updateLocalized(field, lang, event.target.value)
                      }
                      value={selected[field][lang]}
                    />
                  ) : (
                    <textarea
                      onChange={(event) =>
                        updateLocalized(field, lang, event.target.value)
                      }
                      rows={3}
                      value={selected[field][lang]}
                    />
                  )}
                </div>
              )),
            )}
            {(['en', 'ar'] as const).map((lang) => (
              <div className="admin-editor-field" key={`features-${lang}`}>
                <label>features ({lang.toUpperCase()}) — one per line</label>
                <textarea
                  onChange={(event) =>
                    updateSelected({
                      features: {
                        ...selected.features,
                        [lang]: linesToList(event.target.value),
                      },
                    })
                  }
                  rows={4}
                  value={listToLines(selected.features[lang])}
                />
              </div>
            ))}
            {(['en', 'ar'] as const).map((lang) => (
              <div className="admin-editor-field" key={`warnings-${lang}`}>
                <label>warnings ({lang.toUpperCase()}) — one per line</label>
                <textarea
                  onChange={(event) =>
                    updateSelected({
                      warnings: {
                        ...selected.warnings,
                        [lang]: linesToList(event.target.value),
                      },
                    })
                  }
                  rows={4}
                  value={listToLines(selected.warnings[lang])}
                />
              </div>
            ))}

            <div className="admin-editor-field">
              <div className="admin-editor-actions-row">
                <span aria-hidden="true">technicalInfo</span>
                <button
                  className="admin-editor-btn"
                  onClick={() =>
                    updateSelected({
                      technicalInfo: [
                        ...selected.technicalInfo,
                        emptyTechnicalRow(),
                      ],
                    })
                  }
                  type="button"
                >
                  {t('admin.editor.add')}
                </button>
              </div>
              <table className="admin-editor-table">
                <thead>
                  <tr>
                    <th>key</th>
                    <th>label EN</th>
                    <th>label AR</th>
                    <th>value EN</th>
                    <th>value AR</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {selected.technicalInfo.map((row) => (
                    <tr key={row.key}>
                      <td>
                        <input
                          onChange={(event) =>
                            updateTechnicalRow(row.key, {
                              key: event.target.value,
                            })
                          }
                          value={row.key}
                        />
                      </td>
                      <td>
                        <input
                          onChange={(event) =>
                            updateTechnicalLocalized(
                              row.key,
                              'label',
                              'en',
                              event.target.value,
                            )
                          }
                          value={row.label.en}
                        />
                      </td>
                      <td>
                        <input
                          onChange={(event) =>
                            updateTechnicalLocalized(
                              row.key,
                              'label',
                              'ar',
                              event.target.value,
                            )
                          }
                          value={row.label.ar}
                        />
                      </td>
                      <td>
                        <input
                          onChange={(event) =>
                            updateTechnicalLocalized(
                              row.key,
                              'value',
                              'en',
                              event.target.value,
                            )
                          }
                          value={row.value.en}
                        />
                      </td>
                      <td>
                        <input
                          onChange={(event) =>
                            updateTechnicalLocalized(
                              row.key,
                              'value',
                              'ar',
                              event.target.value,
                            )
                          }
                          value={row.value.ar}
                        />
                      </td>
                      <td>
                        <button
                          className="admin-editor-btn admin-editor-btn--danger"
                          onClick={() =>
                            updateSelected({
                              technicalInfo: selected.technicalInfo.filter(
                                (entry) => entry.key !== row.key,
                              ),
                            })
                          }
                          type="button"
                        >
                          {t('admin.editor.delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

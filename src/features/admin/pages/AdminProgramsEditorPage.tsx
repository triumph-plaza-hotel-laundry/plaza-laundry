import { useMemo, useState } from 'react';
import { AdminEditToolbar } from '@/features/admin/components/AdminEditToolbar';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { useDraftState } from '@/features/admin/hooks/useDraftState';
import { programsRepository, type WashingProgram } from '@/data/repositories';
import type { ProgramStep } from '@/data/washing-programs';
import { useAuth, useLanguage } from '@/hooks';
import '@/features/admin/admin-editor.css';

function emptyProgram(): WashingProgram {
  return {
    id: Date.now(),
    title: { en: '', ar: '' },
    durationMin: 0,
    temperatureBadge: { en: '', ar: '' },
    footerNote: { en: '', ar: '' },
    steps: [],
  };
}

function emptyStep(existingSteps: readonly ProgramStep[]): ProgramStep {
  const nextStepNumber =
    existingSteps.length > 0
      ? Math.max(...existingSteps.map((step) => step.step)) + 1
      : 1;

  return {
    step: nextStepNumber,
    process: { en: '', ar: '' },
    waterLevel: '1',
    temperature: { en: 'Cold', ar: 'بارد' },
  };
}

export function AdminProgramsEditorPage() {
  const { t } = useLanguage();
  const { assertCan, logAction } = useAuth();
  const { draft, isDirty, setDraft, resetDraft, commitDraft } =
    useDraftState(programsRepository);
  const [selectedId, setSelectedId] = useState<number | null>(
    draft[0]?.id ?? null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveNoticeIsError, setSaveNoticeIsError] = useState(false);

  const selected = useMemo(
    () => draft.find((program) => program.id === selectedId) ?? null,
    [draft, selectedId],
  );

  const updateSelected = (patch: Partial<WashingProgram>) => {
    if (!selected) {
      return;
    }

    setDraft(
      draft.map((program) =>
        program.id === selected.id ? { ...program, ...patch } : program,
      ),
    );
  };

  const updateLocalized = (
    field: 'title' | 'temperatureBadge' | 'footerNote',
    lang: 'en' | 'ar',
    value: string,
  ) => {
    if (!selected) {
      return;
    }

    updateSelected({ [field]: { ...selected[field], [lang]: value } });
  };

  const updateStep = (stepNumber: number, patch: Partial<ProgramStep>) => {
    if (!selected) {
      return;
    }

    updateSelected({
      steps: selected.steps.map((step) =>
        step.step === stepNumber ? { ...step, ...patch } : step,
      ),
    });
  };

  const updateStepLocalized = (
    stepNumber: number,
    field: 'process' | 'temperature',
    lang: 'en' | 'ar',
    value: string,
  ) => {
    if (!selected) {
      return;
    }

    const step = selected.steps.find((entry) => entry.step === stepNumber);
    if (!step) {
      return;
    }

    updateStep(stepNumber, {
      [field]: { ...step[field], [lang]: value },
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveNotice(null);
    setSaveNoticeIsError(false);
    try {
      assertCan('programs', 'update');
      await commitDraft(async (value) => {
        await programsRepository.replaceAll(value);
        logAction({
          action: 'programs.replaceAll',
          page: 'admin/programs',
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
        subtitle={t('admin.editor.programsSubtitle')}
        titleAr="إدارة برامج الغسيل"
        titleEn="Manage Washing Programs"
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
                const next = emptyProgram();
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
                setDraft(draft.filter((program) => program.id !== selected.id));
                setSelectedId(
                  draft.find((program) => program.id !== selected.id)?.id ??
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
              {draft.map((program) => (
                <tr key={program.id}>
                  <td>
                    <button
                      className="admin-editor-btn"
                      onClick={() => setSelectedId(program.id)}
                      type="button"
                    >
                      {program.title.en || `#${program.id}`}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected ? (
          <div className="admin-editor-panel admin-editor-grid">
            {(['title', 'temperatureBadge', 'footerNote'] as const).flatMap(
              (field) =>
                (['en', 'ar'] as const).map((lang) => (
                  <div className="admin-editor-field" key={`${field}-${lang}`}>
                    <label>
                      {field} ({lang.toUpperCase()})
                    </label>
                    <input
                      onChange={(event) =>
                        updateLocalized(field, lang, event.target.value)
                      }
                      value={selected[field][lang]}
                    />
                  </div>
                )),
            )}
            <div className="admin-editor-field">
              <label>durationMin</label>
              <input
                onChange={(event) =>
                  updateSelected({
                    durationMin: Number.parseInt(event.target.value, 10) || 0,
                  })
                }
                type="number"
                value={selected.durationMin}
              />
            </div>

            <div className="admin-editor-field admin-editor-field--full">
              <div className="admin-editor-actions-row">
                <label>steps</label>
                <button
                  className="admin-editor-btn"
                  onClick={() =>
                    updateSelected({
                      steps: [...selected.steps, emptyStep(selected.steps)],
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
                    <th>#</th>
                    <th>process (EN)</th>
                    <th>process (AR)</th>
                    <th>water</th>
                    <th>temp (EN)</th>
                    <th>temp (AR)</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {selected.steps.map((step) => (
                    <tr key={step.step}>
                      <td>
                        <input
                          onChange={(event) =>
                            updateStep(step.step, {
                              step:
                                Number.parseInt(event.target.value, 10) ||
                                step.step,
                            })
                          }
                          type="number"
                          value={step.step}
                        />
                      </td>
                      <td>
                        <input
                          onChange={(event) =>
                            updateStepLocalized(
                              step.step,
                              'process',
                              'en',
                              event.target.value,
                            )
                          }
                          value={step.process.en}
                        />
                      </td>
                      <td>
                        <input
                          onChange={(event) =>
                            updateStepLocalized(
                              step.step,
                              'process',
                              'ar',
                              event.target.value,
                            )
                          }
                          value={step.process.ar}
                        />
                      </td>
                      <td>
                        <input
                          onChange={(event) =>
                            updateStep(step.step, {
                              waterLevel: event.target.value,
                            })
                          }
                          value={step.waterLevel}
                        />
                      </td>
                      <td>
                        <input
                          onChange={(event) =>
                            updateStepLocalized(
                              step.step,
                              'temperature',
                              'en',
                              event.target.value,
                            )
                          }
                          value={step.temperature.en}
                        />
                      </td>
                      <td>
                        <input
                          onChange={(event) =>
                            updateStepLocalized(
                              step.step,
                              'temperature',
                              'ar',
                              event.target.value,
                            )
                          }
                          value={step.temperature.ar}
                        />
                      </td>
                      <td>
                        <button
                          className="admin-editor-btn admin-editor-btn--danger"
                          onClick={() =>
                            updateSelected({
                              steps: selected.steps.filter(
                                (entry) => entry.step !== step.step,
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

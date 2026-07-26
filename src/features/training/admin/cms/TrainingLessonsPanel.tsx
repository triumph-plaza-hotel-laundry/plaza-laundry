import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Archive,
  ChevronDown,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  MoreVertical,
  Plus,
  Printer,
  Save,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { TrainingLessonRecord } from '@/data/training-cms';
import {
  archiveTrainingLesson,
  createTrainingLesson,
  deleteTrainingLesson,
  duplicateTrainingLesson,
  listTrainingLessons,
  reorderTrainingLessons,
  updateTrainingLesson,
} from '@/data/repositories/training-lessons-repository';
import {
  formatTrainingMonthLabel,
  getCurrentTrainingMonthKey,
} from '@/features/training/cms/month-key';
import { TrainingRichEditor } from '@/features/training/editor/TrainingRichEditor';
import { downloadLessonDocx } from '@/features/training/export/download-lesson-docx';
import { downloadLessonsPdf } from '@/features/training/export/download-lesson-pdf';
import { printTrainingLessons } from '@/features/training/export/print-lesson';

type Props = {
  onChanged: () => void;
  onToast: (message: string, tone: 'success' | 'error') => void;
  assertCanWrite: () => void;
  focusLessonId?: string | null;
};

type Draft = {
  title: string;
  contentHtml: string;
  visibility: 'visible' | 'hidden';
};

function LessonActionMenu({
  open,
  busy,
  onClose,
  onDuplicate,
  onArchive,
  onPdf,
  onWord,
  onPrint,
  onDelete,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onPdf: () => void;
  onWord: () => void;
  onPrint: () => void;
  onDelete: () => void;
}) {
  if (!open) return null;
  return (
    <div className="training-cms-menu" role="menu">
      <button disabled={busy} onClick={onDuplicate} role="menuitem" type="button">
        <Copy size={14} /> تكرار
      </button>
      <button disabled={busy} onClick={onArchive} role="menuitem" type="button">
        <Archive size={14} /> أرشفة
      </button>
      <button disabled={busy} onClick={onPdf} role="menuitem" type="button">
        <Download size={14} /> تحميل PDF
      </button>
      <button disabled={busy} onClick={onWord} role="menuitem" type="button">
        <FileText size={14} /> تحميل Word
      </button>
      <button disabled={busy} onClick={onPrint} role="menuitem" type="button">
        <Printer size={14} /> طباعة
      </button>
      <button
        className="is-danger"
        disabled={busy}
        onClick={onDelete}
        role="menuitem"
        type="button"
      >
        <Trash2 size={14} /> حذف
      </button>
      <button onClick={onClose} role="menuitem" type="button">
        إغلاق
      </button>
    </div>
  );
}

function SortableLessonCard({
  lesson,
  expanded,
  draft,
  saving,
  busy,
  selected,
  menuOpen,
  onToggleSelect,
  onToggle,
  onTitle,
  onHtml,
  onVisibility,
  onSave,
  onMenuToggle,
  onMenuClose,
  onDuplicate,
  onArchive,
  onPdf,
  onWord,
  onPrint,
  onDelete,
}: {
  lesson: TrainingLessonRecord;
  expanded: boolean;
  draft: Draft;
  saving: boolean;
  busy: boolean;
  selected: boolean;
  menuOpen: boolean;
  onToggleSelect: () => void;
  onToggle: () => void;
  onTitle: (v: string) => void;
  onHtml: (v: string) => void;
  onVisibility: () => void;
  onSave: () => void;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onPdf: () => void;
  onWord: () => void;
  onPrint: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lesson.id, disabled: busy });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  const created = new Date(lesson.created_at).toLocaleDateString('ar-EG');
  const updated = new Date(lesson.updated_at).toLocaleDateString('ar-EG');
  const isVisible = draft.visibility === 'visible';

  return (
    <article
      className={`training-cms-lesson-card${expanded ? ' is-open' : ''}`}
      ref={setNodeRef}
      style={style}
    >
      <header className="training-cms-lesson-card__head">
        <label className="training-cms-lesson-card__select">
          <input
            checked={selected}
            disabled={busy}
            onChange={onToggleSelect}
            type="checkbox"
          />
        </label>
        <button
          aria-label="سحب لإعادة الترتيب"
          className="training-cms-lesson-card__grip"
          disabled={busy}
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </button>
        <button
          className="training-cms-lesson-card__toggle"
          disabled={busy}
          onClick={onToggle}
          type="button"
        >
          <div className="training-cms-lesson-card__titles">
            <h3>{lesson.title || 'بدون عنوان'}</h3>
            <p>
              أُنشئ {created} · حُدّث {updated} ·{' '}
              {isVisible ? 'ظاهر' : 'مخفي'}
            </p>
          </div>
          <ChevronDown size={18} />
        </button>
        <div className="training-cms-lesson-card__quick">
          <button
            aria-label={isVisible ? 'إخفاء الدرس' : 'إظهار الدرس'}
            className="training-admin-btn"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onVisibility();
            }}
            title={isVisible ? 'إخفاء' : 'إظهار'}
            type="button"
          >
            {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <div className="training-cms-menu-wrap">
            <button
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="المزيد"
              className="training-admin-btn"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                onMenuToggle();
              }}
              type="button"
            >
              <MoreVertical size={16} />
            </button>
            <LessonActionMenu
              busy={busy}
              onArchive={() => {
                onMenuClose();
                onArchive();
              }}
              onClose={onMenuClose}
              onDelete={() => {
                onMenuClose();
                onDelete();
              }}
              onDuplicate={() => {
                onMenuClose();
                onDuplicate();
              }}
              onPdf={() => {
                onMenuClose();
                onPdf();
              }}
              onPrint={() => {
                onMenuClose();
                onPrint();
              }}
              onWord={() => {
                onMenuClose();
                onWord();
              }}
              open={menuOpen}
            />
          </div>
        </div>
      </header>

      {expanded ? (
        <div className="training-cms-lesson-card__body">
          <label className="training-admin-field">
            <span>عنوان الدرس *</span>
            <input
              disabled={busy}
              onChange={(e) => onTitle(e.target.value)}
              value={draft.title}
            />
          </label>
          <div className="training-admin-field">
            <span>المحتوى</span>
            <TrainingRichEditor
              key={lesson.id}
              onChange={onHtml}
              placeholder="اكتب محتوى الدرس…"
              value={draft.contentHtml}
            />
          </div>
          <div className="training-cms-lesson-card__save-row">
            <button
              className="training-admin-btn training-admin-btn--primary"
              disabled={busy || saving}
              onClick={onSave}
              type="button"
            >
              <Save size={16} /> {saving ? 'جاري الحفظ…' : 'حفظ الدرس'}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function TrainingLessonsPanel({
  onChanged,
  onToast,
  assertCanWrite,
  focusLessonId,
}: Props) {
  const [lessons, setLessons] = useState<TrainingLessonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const actionLock = useRef(false);
  const currentMonth = getCurrentTrainingMonthKey();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const reload = async () => {
    setLoading(true);
    try {
      const rows = await listTrainingLessons({ status: 'active' });
      setLessons(rows);
      const nextDrafts: Record<string, Draft> = {};
      for (const row of rows) {
        nextDrafts[row.id] = {
          title: row.title,
          contentHtml: row.content_html,
          visibility: row.visibility,
        };
      }
      setDrafts(nextDrafts);
      setSelectedIds((prev) => prev.filter((id) => rows.some((r) => r.id === id)));
      setOpenMonths((prev) => ({ [currentMonth]: true, ...prev }));
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : 'تعذر تحميل الدروس',
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!focusLessonId) return;
    const target = lessons.find((l) => l.id === focusLessonId);
    if (!target) return;
    setOpenMonths((prev) => ({ ...prev, [target.month_key]: true }));
    setExpandedId(focusLessonId);
  }, [focusLessonId, lessons]);

  useEffect(() => {
    if (!menuId) return;
    const close = () => setMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuId]);

  const months = useMemo(() => {
    const map = new Map<string, TrainingLessonRecord[]>();
    for (const lesson of lessons) {
      const list = map.get(lesson.month_key) ?? [];
      list.push(lesson);
      map.set(lesson.month_key, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [lessons]);

  const runExclusive = async (
    id: string | null,
    fn: () => Promise<void>,
  ): Promise<void> => {
    if (actionLock.current) return;
    actionLock.current = true;
    if (id) setBusyId(id);
    try {
      await fn();
    } finally {
      actionLock.current = false;
      setBusyId(null);
    }
  };

  const handleCreate = async (monthKey: string) => {
    if (creating || actionLock.current) return;
    await runExclusive(null, async () => {
      setCreating(true);
      try {
        assertCanWrite();
        const created = await createTrainingLesson({
          title: 'درس جديد',
          monthKey,
          contentHtml: '',
        });
        onToast('Saved Successfully', 'success');
        await reload();
        onChanged();
        setOpenMonths((prev) => ({ ...prev, [monthKey]: true }));
        setExpandedId(created.id);
      } catch (error) {
        onToast(
          error instanceof Error ? error.message : 'تعذر الإنشاء',
          'error',
        );
      } finally {
        setCreating(false);
      }
    });
  };

  const handleSave = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    await runExclusive(id, async () => {
      try {
        assertCanWrite();
        if (!draft.title.trim()) {
          onToast('عنوان الدرس مطلوب', 'error');
          return;
        }
        setSavingId(id);
        const updated = await updateTrainingLesson({
          id,
          title: draft.title,
          contentHtml: draft.contentHtml,
          visibility: draft.visibility,
        });
        setLessons((prev) =>
          prev.map((l) => (l.id === id ? updated : l)),
        );
        setDrafts((prev) => ({
          ...prev,
          [id]: {
            title: updated.title,
            contentHtml: updated.content_html,
            visibility: updated.visibility,
          },
        }));
        onToast('Updated Successfully', 'success');
        onChanged();
      } catch (error) {
        onToast(error instanceof Error ? error.message : 'تعذر الحفظ', 'error');
      } finally {
        setSavingId(null);
      }
    });
  };

  const handleDelete = async (lesson: TrainingLessonRecord) => {
    if (!window.confirm(`حذف الدرس «${lesson.title}» نهائياً؟`)) return;
    await runExclusive(lesson.id, async () => {
      try {
        assertCanWrite();
        await deleteTrainingLesson(lesson.id);
        setLessons((prev) => prev.filter((l) => l.id !== lesson.id));
        setSelectedIds((prev) => prev.filter((id) => id !== lesson.id));
        if (expandedId === lesson.id) setExpandedId(null);
        onToast('تم الحذف بنجاح', 'success');
        onChanged();
      } catch (error) {
        onToast(error instanceof Error ? error.message : 'تعذر الحذف', 'error');
        await reload();
      }
    });
  };

  const handleArchive = async (lesson: TrainingLessonRecord) => {
    if (!window.confirm(`أرشفة الدرس «${lesson.title}»؟`)) return;
    await runExclusive(lesson.id, async () => {
      try {
        assertCanWrite();
        await archiveTrainingLesson(lesson.id);
        setLessons((prev) => prev.filter((l) => l.id !== lesson.id));
        setSelectedIds((prev) => prev.filter((id) => id !== lesson.id));
        onToast('Updated Successfully', 'success');
        onChanged();
      } catch (error) {
        onToast(
          error instanceof Error ? error.message : 'تعذر الأرشفة',
          'error',
        );
      }
    });
  };

  const handleDuplicate = async (lesson: TrainingLessonRecord) => {
    await runExclusive(lesson.id, async () => {
      try {
        assertCanWrite();
        const copy = await duplicateTrainingLesson(lesson.id);
        onToast('Saved Successfully', 'success');
        await reload();
        onChanged();
        setExpandedId(copy.id);
      } catch (error) {
        onToast(
          error instanceof Error ? error.message : 'تعذر التكرار',
          'error',
        );
      }
    });
  };

  const handleVisibilityQuick = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    const next = draft.visibility === 'visible' ? 'hidden' : 'visible';
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? draft), visibility: next },
    }));
    await runExclusive(id, async () => {
      try {
        assertCanWrite();
        const updated = await updateTrainingLesson({ id, visibility: next });
        setLessons((prev) => prev.map((l) => (l.id === id ? updated : l)));
        setDrafts((prev) => ({
          ...prev,
          [id]: {
            title: updated.title,
            contentHtml: updated.content_html,
            visibility: updated.visibility,
          },
        }));
        onToast('Updated Successfully', 'success');
        onChanged();
      } catch (error) {
        setDrafts((prev) => ({
          ...prev,
          [id]: { ...(prev[id] ?? draft), visibility: draft.visibility },
        }));
        onToast(
          error instanceof Error ? error.message : 'تعذر التحديث',
          'error',
        );
      }
    });
  };

  const handleDragEnd = async (monthKey: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || actionLock.current) return;
    const monthLessons = lessons.filter((l) => l.month_key === monthKey);
    const oldIndex = monthLessons.findIndex((l) => l.id === active.id);
    const newIndex = monthLessons.findIndex((l) => l.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(monthLessons, oldIndex, newIndex);
    setLessons((prev) => {
      const others = prev.filter((l) => l.month_key !== monthKey);
      return [...others, ...reordered];
    });
    await runExclusive(String(active.id), async () => {
      try {
        assertCanWrite();
        await reorderTrainingLessons(reordered.map((l) => l.id));
        onToast('Updated Successfully', 'success');
        onChanged();
      } catch (error) {
        onToast(
          error instanceof Error ? error.message : 'تعذر إعادة الترتيب',
          'error',
        );
        await reload();
      }
    });
  };

  const exportSelected = async (mode: 'pdf' | 'print') => {
    if (exporting || selectedIds.length === 0) return;
    setExporting(true);
    try {
      const selected = lessons.filter((l) => selectedIds.includes(l.id));
      if (mode === 'pdf') {
        await downloadLessonsPdf(
          selected,
          `training-selected-${selected.length}.pdf`,
        );
        onToast('Saved Successfully', 'success');
      } else {
        printTrainingLessons(selected, {
          heading: 'Selected Training Lessons',
        });
      }
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="training-cms-panel">
      <header className="training-cms-panel__header">
        <div>
          <h2>التدريب المكتوب</h2>
          <p>منظم حسب الشهر — الشهر الحالي مفتوح تلقائياً</p>
        </div>
        <div className="training-cms-gallery__actions">
          {selectedIds.length > 0 ? (
            <>
              <button
                className="training-admin-btn"
                disabled={exporting}
                onClick={() => void exportSelected('pdf')}
                type="button"
              >
                <Download size={16} /> PDF ({selectedIds.length})
              </button>
              <button
                className="training-admin-btn"
                disabled={exporting}
                onClick={() => void exportSelected('print')}
                type="button"
              >
                <Printer size={16} /> Print ({selectedIds.length})
              </button>
            </>
          ) : null}
          <button
            className="training-admin-btn training-admin-btn--primary"
            disabled={creating || loading}
            onClick={() => void handleCreate(currentMonth)}
            type="button"
          >
            <Plus size={18} /> {creating ? 'جاري الإنشاء…' : 'درس جديد'}
          </button>
        </div>
      </header>

      {loading ? (
        <p className="training-cms-empty">جاري التحميل…</p>
      ) : months.length === 0 ? (
        <div className="training-cms-empty-block">
          <p className="training-cms-empty">لا توجد دروس بعد</p>
          <button
            className="training-admin-btn training-admin-btn--primary"
            disabled={creating}
            onClick={() => void handleCreate(currentMonth)}
            type="button"
          >
            إنشاء أول درس لهذا الشهر
          </button>
        </div>
      ) : (
        <div className="training-cms-months">
          {months.map(([monthKey, monthLessons]) => {
            const open = openMonths[monthKey] ?? monthKey === currentMonth;
            return (
              <section className="training-cms-month" key={monthKey}>
                <button
                  className="training-cms-month__head"
                  onClick={() =>
                    setOpenMonths((prev) => ({
                      ...prev,
                      [monthKey]: !open,
                    }))
                  }
                  type="button"
                >
                  <div>
                    <h3>{formatTrainingMonthLabel(monthKey, 'en')}</h3>
                    <p>{monthLessons.length} Lessons</p>
                  </div>
                  <ChevronDown
                    className={open ? 'is-open' : undefined}
                    size={20}
                  />
                </button>
                {open ? (
                  <div className="training-cms-month__body">
                    <DndContext
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => void handleDragEnd(monthKey, e)}
                      sensors={sensors}
                    >
                      <SortableContext
                        items={monthLessons.map((l) => l.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {monthLessons.map((lesson) => {
                          const draft = drafts[lesson.id] ?? {
                            title: lesson.title,
                            contentHtml: lesson.content_html,
                            visibility: lesson.visibility,
                          };
                          const busy = busyId === lesson.id;
                          return (
                            <SortableLessonCard
                              busy={busy}
                              draft={draft}
                              expanded={expandedId === lesson.id}
                              key={lesson.id}
                              lesson={lesson}
                              menuOpen={menuId === lesson.id}
                              onArchive={() => void handleArchive(lesson)}
                              onDelete={() => void handleDelete(lesson)}
                              onDuplicate={() => void handleDuplicate(lesson)}
                              onHtml={(contentHtml) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [lesson.id]: { ...draft, contentHtml },
                                }))
                              }
                              onMenuClose={() => setMenuId(null)}
                              onMenuToggle={() =>
                                setMenuId((id) =>
                                  id === lesson.id ? null : lesson.id,
                                )
                              }
                              onPdf={() => {
                                void downloadLessonsPdf(
                                  [lesson],
                                  `${lesson.title || 'lesson'}.pdf`,
                                )
                                  .then(() =>
                                    onToast('Saved Successfully', 'success'),
                                  )
                                  .catch((error: unknown) =>
                                    onToast(
                                      error instanceof Error
                                        ? error.message
                                        : 'PDF failed',
                                      'error',
                                    ),
                                  );
                              }}
                              onPrint={() => printTrainingLessons([lesson])}
                              onSave={() => void handleSave(lesson.id)}
                              onTitle={(title) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [lesson.id]: { ...draft, title },
                                }))
                              }
                              onToggle={() =>
                                setExpandedId((id) =>
                                  id === lesson.id ? null : lesson.id,
                                )
                              }
                              onToggleSelect={() =>
                                setSelectedIds((prev) =>
                                  prev.includes(lesson.id)
                                    ? prev.filter((id) => id !== lesson.id)
                                    : [...prev, lesson.id],
                                )
                              }
                              onVisibility={() =>
                                void handleVisibilityQuick(lesson.id)
                              }
                              onWord={() => {
                                void downloadLessonDocx(lesson)
                                  .then(() =>
                                    onToast('Saved Successfully', 'success'),
                                  )
                                  .catch((error: unknown) =>
                                    onToast(
                                      error instanceof Error
                                        ? error.message
                                        : 'Word failed',
                                      'error',
                                    ),
                                  );
                              }}
                              saving={savingId === lesson.id}
                              selected={selectedIds.includes(lesson.id)}
                            />
                          );
                        })}
                      </SortableContext>
                    </DndContext>
                    <button
                      className="training-admin-btn"
                      disabled={creating}
                      onClick={() => void handleCreate(monthKey)}
                      type="button"
                    >
                      <Plus size={16} /> إضافة درس لهذا الشهر
                    </button>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

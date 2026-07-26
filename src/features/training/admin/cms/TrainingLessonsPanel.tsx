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
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { TrainingLessonRecord } from '@/data/training-cms';
import {
  createTrainingLesson,
  deleteTrainingLesson,
  listTrainingLessons,
  reorderTrainingLessons,
  updateTrainingLesson,
} from '@/data/repositories/training-lessons-repository';
import {
  formatTrainingMonthLabel,
  getCurrentTrainingMonthKey,
} from '@/features/training/cms/month-key';
import { TrainingRichEditor } from '@/features/training/editor/TrainingRichEditor';
import { downloadLessonsPdf } from '@/features/training/export/download-lesson-pdf';
import { printTrainingLessons } from '@/features/training/export/print-lesson';

type Props = {
  onChanged: () => void;
  onToast: (message: string, tone: 'success' | 'error') => void;
  assertCanWrite: () => void;
  focusLessonId?: string | null;
};

function SortableLessonCard({
  lesson,
  expanded,
  draftTitle,
  draftHtml,
  draftVisibility,
  saving,
  selected,
  onToggleSelect,
  onToggle,
  onTitle,
  onHtml,
  onVisibility,
  onSave,
  onDelete,
}: {
  lesson: TrainingLessonRecord;
  expanded: boolean;
  draftTitle: string;
  draftHtml: string;
  draftVisibility: 'visible' | 'hidden';
  saving: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onToggle: () => void;
  onTitle: (v: string) => void;
  onHtml: (v: string) => void;
  onVisibility: (v: 'visible' | 'hidden') => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  const created = new Date(lesson.created_at).toLocaleDateString('ar-EG');
  const updated = new Date(lesson.updated_at).toLocaleDateString('ar-EG');

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
            onChange={onToggleSelect}
            type="checkbox"
          />
        </label>
        <button
          aria-label="سحب لإعادة الترتيب"
          className="training-cms-lesson-card__grip"
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </button>
        <button
          className="training-cms-lesson-card__toggle"
          onClick={onToggle}
          type="button"
        >
          <div className="training-cms-lesson-card__titles">
            <h3>{lesson.title || 'بدون عنوان'}</h3>
            <p>
              أُنشئ {created} · حُدّث {updated} ·{' '}
              {lesson.visibility === 'hidden' ? 'مخفي' : 'ظاهر'}
            </p>
          </div>
          <ChevronDown size={18} />
        </button>
        <div className="training-cms-lesson-card__quick">
          <button
            className="training-admin-btn"
            onClick={() =>
              onVisibility(draftVisibility === 'hidden' ? 'visible' : 'hidden')
            }
            type="button"
          >
            {draftVisibility === 'hidden' ? (
              <Eye size={16} />
            ) : (
              <EyeOff size={16} />
            )}
          </button>
          <button
            className="training-admin-btn training-admin-btn--danger"
            onClick={onDelete}
            type="button"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      {expanded ? (
        <div className="training-cms-lesson-card__body">
          <label className="training-admin-field">
            <span>عنوان الدرس *</span>
            <input onChange={(e) => onTitle(e.target.value)} value={draftTitle} />
          </label>
          <div className="training-admin-field">
            <span>المحتوى</span>
            <TrainingRichEditor
              key={lesson.id}
              onChange={onHtml}
              placeholder="اكتب محتوى الدرس…"
              value={draftHtml}
            />
          </div>
          <div className="training-cms-lesson-card__save-row">
            <button
              className="training-admin-btn training-admin-btn--primary"
              disabled={saving}
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
  const [drafts, setDrafts] = useState<
    Record<
      string,
      { title: string; contentHtml: string; visibility: 'visible' | 'hidden' }
    >
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const currentMonth = getCurrentTrainingMonthKey();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const reload = async () => {
    setLoading(true);
    try {
      const rows = await listTrainingLessons({ status: 'active' });
      setLessons(rows);
      const nextDrafts: typeof drafts = {};
      for (const row of rows) {
        nextDrafts[row.id] = {
          title: row.title,
          contentHtml: row.content_html,
          visibility: row.visibility,
        };
      }
      setDrafts(nextDrafts);
      setOpenMonths((prev) => ({
        [currentMonth]: true,
        ...prev,
      }));
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

  const months = useMemo(() => {
    const map = new Map<string, TrainingLessonRecord[]>();
    for (const lesson of lessons) {
      const list = map.get(lesson.month_key) ?? [];
      list.push(lesson);
      map.set(lesson.month_key, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [lessons]);

  const handleCreate = async (monthKey: string) => {
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
      onToast(error instanceof Error ? error.message : 'تعذر الإنشاء', 'error');
    }
  };

  const handleSave = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    try {
      assertCanWrite();
      if (!draft.title.trim()) {
        onToast('عنوان الدرس مطلوب', 'error');
        return;
      }
      setSavingId(id);
      await updateTrainingLesson({
        id,
        title: draft.title,
        contentHtml: draft.contentHtml,
        visibility: draft.visibility,
      });
      onToast('Updated Successfully', 'success');
      await reload();
      onChanged();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'تعذر الحفظ', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (lesson: TrainingLessonRecord) => {
    if (!window.confirm(`حذف الدرس «${lesson.title}»؟`)) return;
    try {
      assertCanWrite();
      await deleteTrainingLesson(lesson.id);
      onToast('تم الحذف بنجاح', 'success');
      await reload();
      onChanged();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'تعذر الحذف', 'error');
    }
  };

  const handleVisibilityQuick = async (
    id: string,
    visibility: 'visible' | 'hidden',
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], visibility },
    }));
    try {
      assertCanWrite();
      await updateTrainingLesson({ id, visibility });
      onToast('Updated Successfully', 'success');
      await reload();
      onChanged();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'تعذر التحديث', 'error');
    }
  };

  const handleDragEnd = async (monthKey: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const monthLessons = lessons.filter((l) => l.month_key === monthKey);
    const oldIndex = monthLessons.findIndex((l) => l.id === active.id);
    const newIndex = monthLessons.findIndex((l) => l.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(monthLessons, oldIndex, newIndex);
    setLessons((prev) => {
      const others = prev.filter((l) => l.month_key !== monthKey);
      return [...others, ...reordered];
    });
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
                onClick={() => {
                  const selected = lessons.filter((l) =>
                    selectedIds.includes(l.id),
                  );
                  void downloadLessonsPdf(
                    selected,
                    `training-selected-${selected.length}.pdf`,
                  )
                    .then(() => onToast('Saved Successfully', 'success'))
                    .catch((error: unknown) =>
                      onToast(
                        error instanceof Error
                          ? error.message
                          : 'PDF failed',
                        'error',
                      ),
                    );
                }}
                type="button"
              >
                <Download size={16} /> PDF ({selectedIds.length})
              </button>
              <button
                className="training-admin-btn"
                onClick={() => {
                  const selected = lessons.filter((l) =>
                    selectedIds.includes(l.id),
                  );
                  printTrainingLessons(selected, {
                    heading: 'Selected Training Lessons',
                  });
                }}
                type="button"
              >
                Print ({selectedIds.length})
              </button>
            </>
          ) : null}
          <button
            className="training-admin-btn training-admin-btn--primary"
            onClick={() => void handleCreate(currentMonth)}
            type="button"
          >
            <Plus size={18} /> درس جديد
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
                          return (
                            <SortableLessonCard
                              draftHtml={draft.contentHtml}
                              draftTitle={draft.title}
                              draftVisibility={draft.visibility}
                              expanded={expandedId === lesson.id}
                              key={lesson.id}
                              lesson={lesson}
                              onDelete={() => void handleDelete(lesson)}
                              onHtml={(contentHtml) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [lesson.id]: { ...draft, contentHtml },
                                }))
                              }
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
                              onVisibility={(visibility) =>
                                void handleVisibilityQuick(lesson.id, visibility)
                              }
                              saving={savingId === lesson.id}
                              selected={selectedIds.includes(lesson.id)}
                            />
                          );
                        })}
                      </SortableContext>
                    </DndContext>
                    <button
                      className="training-admin-btn"
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

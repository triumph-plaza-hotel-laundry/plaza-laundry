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
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Download,
  GripVertical,
  ImagePlus,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { TrainingImageRecord } from '@/data/training-cms';
import {
  createTrainingImage,
  deleteTrainingImage,
  listTrainingImages,
  reorderTrainingImages,
  updateTrainingImage,
} from '@/data/repositories/training-images-repository';
import { downloadUrl } from '@/features/training/export/print-lesson';

type Props = {
  onChanged: () => void;
  onToast: (message: string, tone: 'success' | 'error') => void;
  assertCanWrite: () => void;
};

type FormState = {
  id?: string;
  title: string;
  description: string;
  file: File | null;
  previewUrl: string;
};

const emptyForm = (): FormState => ({
  title: '',
  description: '',
  file: null,
  previewUrl: '',
});

function SortableImageCard({
  item,
  busy,
  onEdit,
  onDelete,
  onDownload,
  onLightbox,
}: {
  item: TrainingImageRecord;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onLightbox: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: busy });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <article
      className="training-cms-gallery__card"
      ref={setNodeRef}
      style={style}
    >
      <button
        className="training-cms-gallery__thumb"
        onClick={onLightbox}
        type="button"
      >
        <img alt={item.title} loading="lazy" src={item.public_url} />
      </button>
      <div className="training-cms-gallery__meta">
        <div className="training-cms-gallery__title-row">
          <button
            aria-label="سحب لإعادة الترتيب"
            className="training-cms-lesson-card__grip"
            disabled={busy}
            type="button"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
          </button>
          <h3>{item.title || 'بدون عنوان'}</h3>
        </div>
        {item.description ? <p>{item.description}</p> : null}
        <div className="training-cms-gallery__actions">
          <button
            className="training-admin-btn"
            disabled={busy}
            onClick={onEdit}
            type="button"
          >
            <Pencil size={16} /> تعديل
          </button>
          <button
            className="training-admin-btn"
            disabled={busy}
            onClick={onDownload}
            type="button"
          >
            <Download size={16} /> تحميل
          </button>
          <button
            className="training-admin-btn training-admin-btn--danger"
            disabled={busy}
            onClick={onDelete}
            type="button"
          >
            <Trash2 size={16} /> حذف
          </button>
        </div>
      </div>
    </article>
  );
}

export function TrainingImagesPanel({
  onChanged,
  onToast,
  assertCanWrite,
}: Props) {
  const [items, setItems] = useState<TrainingImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [lightbox, setLightbox] = useState<TrainingImageRecord | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lock = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const reload = async () => {
    setLoading(true);
    try {
      setItems(await listTrainingImages('active'));
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : 'تعذر تحميل الصور',
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

  const openCreate = () => {
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (item: TrainingImageRecord) => {
    setForm({
      id: item.id,
      title: item.title,
      description: item.description,
      file: null,
      previewUrl: item.public_url,
    });
    setFormOpen(true);
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, file, previewUrl }));
  };

  const handleSave = async () => {
    if (saving || lock.current) return;
    lock.current = true;
    try {
      assertCanWrite();
      if (!form.title.trim()) {
        onToast('عنوان الصورة مطلوب', 'error');
        return;
      }
      if (!form.id && !form.file) {
        onToast('يرجى اختيار صورة للرفع', 'error');
        return;
      }
      setSaving(true);
      setProgress(0);
      if (form.id) {
        const updated = await updateTrainingImage({
          id: form.id,
          title: form.title,
          description: form.description,
          file: form.file ?? undefined,
          onProgress: setProgress,
        });
        setItems((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
        onToast('Updated Successfully', 'success');
      } else {
        const created = await createTrainingImage({
          title: form.title,
          description: form.description,
          file: form.file!,
          onProgress: setProgress,
        });
        setItems((prev) => [created, ...prev]);
        onToast('Saved Successfully', 'success');
      }
      setFormOpen(false);
      setForm(emptyForm());
      onChanged();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'تعذر الحفظ', 'error');
    } finally {
      setSaving(false);
      setProgress(null);
      lock.current = false;
    }
  };

  const handleDelete = async (item: TrainingImageRecord) => {
    if (!window.confirm(`حذف الصورة «${item.title || 'بدون عنوان'}»؟`)) return;
    if (lock.current) return;
    lock.current = true;
    setBusyId(item.id);
    try {
      assertCanWrite();
      await deleteTrainingImage(item.id);
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      if (lightbox?.id === item.id) setLightbox(null);
      onToast('تم الحذف بنجاح', 'success');
      onChanged();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'تعذر الحذف', 'error');
      await reload();
    } finally {
      setBusyId(null);
      lock.current = false;
    }
  };

  const handleDownload = async (item: TrainingImageRecord) => {
    try {
      await downloadUrl(`${item.title || 'image'}.jpg`, item.public_url);
      onToast('Saved Successfully', 'success');
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : 'تعذر التحميل',
        'error',
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || lock.current) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    lock.current = true;
    try {
      assertCanWrite();
      await reorderTrainingImages(reordered.map((i) => i.id));
      onToast('Updated Successfully', 'success');
      onChanged();
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : 'تعذر إعادة الترتيب',
        'error',
      );
      await reload();
    } finally {
      lock.current = false;
    }
  };

  return (
    <section className="training-cms-panel">
      <header className="training-cms-panel__header">
        <div>
          <h2>معرض الصور</h2>
          <p>مكتبة صور مستقلة — لا ترتبط بالدروس المكتوبة</p>
        </div>
        <button
          className="training-admin-btn training-admin-btn--primary"
          disabled={saving || loading}
          onClick={openCreate}
          type="button"
        >
          <ImagePlus size={18} /> إضافة صورة
        </button>
      </header>

      {loading ? (
        <p className="training-cms-empty">جاري التحميل…</p>
      ) : items.length === 0 ? (
        <p className="training-cms-empty">لا توجد صور بعد</p>
      ) : (
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={(e) => void handleDragEnd(e)}
          sensors={sensors}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={rectSortingStrategy}
          >
            <div className="training-cms-gallery">
              {items.map((item) => (
                <SortableImageCard
                  busy={busyId === item.id}
                  item={item}
                  key={item.id}
                  onDelete={() => void handleDelete(item)}
                  onDownload={() => void handleDownload(item)}
                  onEdit={() => openEdit(item)}
                  onLightbox={() => setLightbox(item)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {formOpen ? (
        <div
          aria-modal="true"
          className="training-dialog-backdrop"
          onClick={() => !saving && setFormOpen(false)}
          role="dialog"
        >
          <div
            className="training-cms-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="training-cms-dialog__header">
              <h3>{form.id ? 'تعديل صورة' : 'إضافة صورة'}</h3>
              <button
                className="training-admin-btn"
                disabled={saving}
                onClick={() => setFormOpen(false)}
                type="button"
              >
                إغلاق
              </button>
            </header>
            <div className="training-cms-dialog__body">
              <label className="training-admin-field">
                <span>العنوان *</span>
                <input
                  disabled={saving}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  value={form.title}
                />
              </label>
              <label className="training-admin-field">
                <span>الوصف</span>
                <textarea
                  disabled={saving}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  value={form.description}
                />
              </label>
              <div className="training-cms-upload">
                {form.previewUrl ? (
                  <img
                    alt=""
                    className="training-cms-upload__preview"
                    src={form.previewUrl}
                  />
                ) : null}
                <input
                  accept="image/*"
                  hidden
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  ref={fileRef}
                  type="file"
                />
                <button
                  className="training-admin-btn"
                  disabled={saving}
                  onClick={() => fileRef.current?.click()}
                  type="button"
                >
                  <Upload size={16} />{' '}
                  {form.id ? 'استبدال الصورة' : 'رفع صورة'}
                </button>
                {progress !== null ? (
                  <div className="training-cms-progress">
                    <div style={{ width: `${progress}%` }} />
                    <span>{progress}%</span>
                  </div>
                ) : null}
              </div>
            </div>
            <footer className="training-cms-dialog__footer">
              <button
                className="training-admin-btn training-admin-btn--primary"
                disabled={saving}
                onClick={() => void handleSave()}
                type="button"
              >
                {saving ? 'جاري الحفظ…' : form.id ? 'تحديث' : 'حفظ'}
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {lightbox ? (
        <div
          aria-modal="true"
          className="training-cms-lightbox"
          onClick={() => setLightbox(null)}
          role="dialog"
        >
          <figure onClick={(e) => e.stopPropagation()}>
            <img alt={lightbox.title} src={lightbox.public_url} />
            <figcaption>
              <strong>{lightbox.title}</strong>
              {lightbox.description ? <p>{lightbox.description}</p> : null}
            </figcaption>
            <div className="training-cms-gallery__actions">
              <button
                className="training-admin-btn"
                onClick={() => void handleDownload(lightbox)}
                type="button"
              >
                <Download size={16} /> تحميل
              </button>
              <button
                className="training-admin-btn"
                onClick={() => setLightbox(null)}
                type="button"
              >
                إغلاق
              </button>
            </div>
          </figure>
        </div>
      ) : null}
    </section>
  );
}

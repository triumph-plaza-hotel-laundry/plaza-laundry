import { ImagePlus, Pencil, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { TrainingImageRecord } from '@/data/training-cms';
import {
  createTrainingImage,
  deleteTrainingImage,
  listTrainingImages,
  updateTrainingImage,
} from '@/data/repositories/training-images-repository';

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

export function TrainingImagesPanel({
  onChanged,
  onToast,
  assertCanWrite,
}: Props) {
  const [items, setItems] = useState<TrainingImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [lightbox, setLightbox] = useState<TrainingImageRecord | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
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
        await updateTrainingImage({
          id: form.id,
          title: form.title,
          description: form.description,
          file: form.file ?? undefined,
          onProgress: setProgress,
        });
        onToast('Updated Successfully', 'success');
      } else {
        await createTrainingImage({
          title: form.title,
          description: form.description,
          file: form.file!,
          onProgress: setProgress,
        });
        onToast('Saved Successfully', 'success');
      }
      setFormOpen(false);
      setForm(emptyForm());
      await reload();
      onChanged();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'تعذر الحفظ', 'error');
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  const handleDelete = async (item: TrainingImageRecord) => {
    if (!window.confirm(`حذف الصورة «${item.title || 'بدون عنوان'}»؟`)) return;
    try {
      assertCanWrite();
      await deleteTrainingImage(item.id);
      onToast('تم الحذف بنجاح', 'success');
      await reload();
      onChanged();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'تعذر الحذف', 'error');
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
        <div className="training-cms-gallery">
          {items.map((item) => (
            <article className="training-cms-gallery__card" key={item.id}>
              <button
                className="training-cms-gallery__thumb"
                onClick={() => setLightbox(item)}
                type="button"
              >
                <img alt={item.title} loading="lazy" src={item.public_url} />
              </button>
              <div className="training-cms-gallery__meta">
                <h3>{item.title || 'بدون عنوان'}</h3>
                {item.description ? <p>{item.description}</p> : null}
                <div className="training-cms-gallery__actions">
                  <button
                    className="training-admin-btn"
                    onClick={() => openEdit(item)}
                    type="button"
                  >
                    <Pencil size={16} /> تعديل
                  </button>
                  <button
                    className="training-admin-btn training-admin-btn--danger"
                    onClick={() => void handleDelete(item)}
                    type="button"
                  >
                    <Trash2 size={16} /> حذف
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
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
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  value={form.title}
                />
              </label>
              <label className="training-admin-field">
                <span>الوصف</span>
                <textarea
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
                  <img alt="" className="training-cms-upload__preview" src={form.previewUrl} />
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
            <button
              className="training-admin-btn"
              onClick={() => setLightbox(null)}
              type="button"
            >
              إغلاق
            </button>
          </figure>
        </div>
      ) : null}
    </section>
  );
}

import { Film, Pencil, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { TrainingVideoRecord } from '@/data/training-cms';
import {
  createTrainingVideo,
  deleteTrainingVideo,
  listTrainingVideos,
  updateTrainingVideo,
} from '@/data/repositories/training-videos-repository';
import { getYoutubeEmbedUrl } from '@/features/training/youtube';

type Props = {
  onChanged: () => void;
  onToast: (message: string, tone: 'success' | 'error') => void;
  assertCanWrite: () => void;
};

type FormState = {
  id?: string;
  title: string;
  description: string;
  youtubeUrl: string;
  file: File | null;
  mode: 'youtube' | 'mp4';
};

const emptyForm = (): FormState => ({
  title: '',
  description: '',
  youtubeUrl: '',
  file: null,
  mode: 'youtube',
});

export function TrainingVideosPanel({
  onChanged,
  onToast,
  assertCanWrite,
}: Props) {
  const [items, setItems] = useState<TrainingVideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    setLoading(true);
    try {
      setItems(await listTrainingVideos('active'));
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : 'تعذر تحميل الفيديوهات',
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

  const openEdit = (item: TrainingVideoRecord) => {
    setForm({
      id: item.id,
      title: item.title,
      description: item.description,
      youtubeUrl: item.source_type === 'youtube' ? item.media_url : '',
      file: null,
      mode: item.source_type,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    try {
      assertCanWrite();
      if (!form.title.trim()) {
        onToast('عنوان الفيديو مطلوب', 'error');
        return;
      }
      setSaving(true);
      setProgress(0);

      if (form.id) {
        await updateTrainingVideo({
          id: form.id,
          title: form.title,
          description: form.description,
          youtubeUrl:
            form.mode === 'youtube' ? form.youtubeUrl : undefined,
          file: form.mode === 'mp4' && form.file ? form.file : undefined,
          onProgress: setProgress,
        });
        onToast('Updated Successfully', 'success');
      } else {
        if (form.mode === 'mp4') {
          if (!form.file) {
            onToast('يرجى اختيار ملف MP4', 'error');
            return;
          }
          await createTrainingVideo({
            title: form.title,
            description: form.description,
            file: form.file,
            onProgress: setProgress,
          });
        } else {
          if (!form.youtubeUrl.trim()) {
            onToast('رابط يوتيوب مطلوب', 'error');
            return;
          }
          await createTrainingVideo({
            title: form.title,
            description: form.description,
            youtubeUrl: form.youtubeUrl,
          });
        }
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

  const handleDelete = async (item: TrainingVideoRecord) => {
    if (!window.confirm(`حذف الفيديو «${item.title || 'بدون عنوان'}»؟`)) return;
    try {
      assertCanWrite();
      await deleteTrainingVideo(item.id);
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
          <h2>الفيديوهات</h2>
          <p>يوتيوب أو رفع MP4 — مستقل عن الصور والدروس</p>
        </div>
        <button
          className="training-admin-btn training-admin-btn--primary"
          onClick={openCreate}
          type="button"
        >
          <Film size={18} /> إضافة فيديو
        </button>
      </header>

      {loading ? (
        <p className="training-cms-empty">جاري التحميل…</p>
      ) : items.length === 0 ? (
        <p className="training-cms-empty">لا توجد فيديوهات بعد</p>
      ) : (
        <div className="training-cms-videos">
          {items.map((item) => {
            const embed =
              item.source_type === 'youtube'
                ? getYoutubeEmbedUrl(item.media_url)
                : null;
            return (
              <article className="training-cms-video-card" key={item.id}>
                <div className="training-cms-video-card__media">
                  {item.source_type === 'mp4' ? (
                    <video
                      className="training-cms-video-card__player"
                      controls
                      playsInline
                      preload="metadata"
                      src={item.media_url}
                    >
                      <track kind="captions" />
                    </video>
                  ) : embed ? (
                    <iframe
                      allowFullScreen
                      className="training-cms-video-card__player"
                      loading="lazy"
                      src={embed}
                      title={item.title || 'video'}
                    />
                  ) : (
                    <div className="training-cms-empty">رابط غير صالح</div>
                  )}
                </div>
                <div className="training-cms-video-card__meta">
                  <h3>{item.title || 'بدون عنوان'}</h3>
                  {item.description ? <p>{item.description}</p> : null}
                  <span className="training-cms-badge">
                    {item.source_type === 'mp4' ? 'MP4' : 'YouTube'}
                  </span>
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
            );
          })}
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
              <h3>{form.id ? 'تعديل فيديو' : 'إضافة فيديو'}</h3>
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
              <div className="training-cms-segment">
                <button
                  className={
                    form.mode === 'youtube'
                      ? 'training-admin-btn training-admin-btn--primary'
                      : 'training-admin-btn'
                  }
                  onClick={() =>
                    setForm((prev) => ({ ...prev, mode: 'youtube' }))
                  }
                  type="button"
                >
                  YouTube
                </button>
                <button
                  className={
                    form.mode === 'mp4'
                      ? 'training-admin-btn training-admin-btn--primary'
                      : 'training-admin-btn'
                  }
                  onClick={() => setForm((prev) => ({ ...prev, mode: 'mp4' }))}
                  type="button"
                >
                  MP4
                </button>
              </div>
              {form.mode === 'youtube' ? (
                <label className="training-admin-field">
                  <span>رابط يوتيوب</span>
                  <input
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        youtubeUrl: e.target.value,
                      }))
                    }
                    placeholder="https://www.youtube.com/watch?v=…"
                    value={form.youtubeUrl}
                  />
                </label>
              ) : (
                <div className="training-cms-upload">
                  <input
                    accept="video/mp4,video/*"
                    hidden
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        file: e.target.files?.[0] ?? null,
                      }))
                    }
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
                    {form.file
                      ? form.file.name
                      : form.id
                        ? 'استبدال ملف MP4'
                        : 'رفع MP4'}
                  </button>
                  {progress !== null ? (
                    <div className="training-cms-progress">
                      <div style={{ width: `${progress}%` }} />
                      <span>{progress}%</span>
                    </div>
                  ) : null}
                </div>
              )}
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
    </section>
  );
}

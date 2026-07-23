import { GripVertical, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState, type DragEvent } from 'react';
import {
  createEmptyVideo,
  detectVideoSource,
  type TrainingVideo,
} from '@/data/training-content';
import {
  getYoutubeEmbedUrl,
  getYoutubeThumbnail,
} from '@/features/training/youtube';

const MAX_MP4_BYTES = 40 * 1024 * 1024;

type LessonVideosManagerProps = {
  videos: TrainingVideo[];
  onChange: (videos: TrainingVideo[]) => void;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('تعذر قراءة ملف الفيديو.'));
    };
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الفيديو.'));
    reader.readAsDataURL(file);
  });
}

export function LessonVideosManager({
  videos,
  onChange,
}: LessonVideosManagerProps) {
  const ordered = useMemo(
    () => [...videos].sort((a, b) => a.displayOrder - b.displayOrder),
    [videos],
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    ordered[0]?.id ?? null,
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = ordered.find((video) => video.id === selectedId) ?? null;

  const commit = (next: TrainingVideo[]) => {
    onChange(
      next
        .map((video, index) => ({ ...video, displayOrder: index }))
        .sort((a, b) => a.displayOrder - b.displayOrder),
    );
  };

  const updateSelected = (patch: Partial<TrainingVideo>) => {
    if (!selected) {
      return;
    }
    commit(
      ordered.map((video) =>
        video.id === selected.id
          ? {
              ...video,
              ...patch,
              sourceType:
                patch.youtubeUrl !== undefined
                  ? detectVideoSource(patch.youtubeUrl)
                  : (patch.sourceType ?? video.sourceType),
            }
          : video,
      ),
    );
  };

  const addFromUrl = () => {
    const url = urlDraft.trim();
    if (!url) {
      setStatus('أدخل رابط يوتيوب أو MP4.');
      return;
    }
    const source = detectVideoSource(url);
    if (source === 'youtube' && !getYoutubeEmbedUrl(url)) {
      setStatus('رابط يوتيوب غير صالح.');
      return;
    }
    const next = createEmptyVideo(ordered.length);
    next.youtubeUrl = url;
    next.sourceType = source;
    next.title = source === 'youtube' ? 'فيديو يوتيوب' : 'فيديو MP4';
    commit([...ordered, next]);
    setSelectedId(next.id);
    setUrlDraft('');
    setStatus(null);
  };

  const addFromFile = async (file: File) => {
    if (!file.type.startsWith('video/') && !file.name.toLowerCase().endsWith('.mp4')) {
      setStatus('يُسمح بملفات الفيديو فقط (MP4).');
      return;
    }
    if (file.size > MAX_MP4_BYTES) {
      setStatus('حجم الفيديو كبير جداً. الحد الأقصى 40 ميجابايت.');
      return;
    }
    setStatus('جاري رفع الفيديو…');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const next = createEmptyVideo(ordered.length);
      next.youtubeUrl = dataUrl;
      next.sourceType = 'mp4';
      next.title = file.name.replace(/\.mp4$/i, '') || 'فيديو مرفوع';
      commit([...ordered, next]);
      setSelectedId(next.id);
      setStatus(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'تعذر رفع الفيديو.');
    }
  };

  const reorder = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const list = [...ordered];
    const fromIndex = list.findIndex((video) => video.id === fromId);
    const toIndex = list.findIndex((video) => video.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    commit(list);
  };

  return (
    <section className="training-lesson-videos">
      <header className="training-lesson-videos__header">
        <div>
          <h3>فيديوهات الدرس</h3>
          <p>اختياري — يمكنك إضافة يوتيوب أو رفع MP4 بدون كتابة محتوى نصي.</p>
        </div>
      </header>

      <div className="training-lesson-videos__add">
        <input
          dir="ltr"
          onChange={(event) => setUrlDraft(event.target.value)}
          placeholder="https://youtube.com/... أو رابط MP4"
          value={urlDraft}
        />
        <button
          className="training-admin-btn training-admin-btn--primary"
          onClick={addFromUrl}
          type="button"
        >
          <Plus size={15} /> إضافة رابط
        </button>
        <button
          className="training-admin-btn"
          onClick={() => fileRef.current?.click()}
          type="button"
        >
          <Upload size={15} /> رفع MP4
        </button>
        <input
          accept="video/mp4,video/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void addFromFile(file);
          }}
          ref={fileRef}
          type="file"
        />
      </div>
      {status ? <p className="training-admin-status">{status}</p> : null}

      <div className="training-lesson-videos__body">
        <div className="training-lesson-videos__list" role="list">
          {ordered.length === 0 ? (
            <p className="training-admin-empty">لا توجد فيديوهات بعد.</p>
          ) : null}
          {ordered.map((video) => {
            const thumb =
              video.thumbnailUrl || getYoutubeThumbnail(video.youtubeUrl);
            return (
              <button
                className={`training-lesson-videos__card${selectedId === video.id ? ' is-selected' : ''}${dragId === video.id ? ' is-dragging' : ''}`}
                draggable
                key={video.id}
                onClick={() => setSelectedId(video.id)}
                onDragOver={(event) => event.preventDefault()}
                onDragStart={(event: DragEvent) => {
                  setDragId(video.id);
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', video.id);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const fromId =
                    event.dataTransfer.getData('text/plain') || dragId;
                  if (fromId) reorder(fromId, video.id);
                  setDragId(null);
                }}
                role="listitem"
                type="button"
              >
                <span aria-hidden className="training-lesson-videos__grip">
                  <GripVertical size={14} />
                </span>
                {thumb ? (
                  <img alt="" loading="lazy" src={thumb} />
                ) : (
                  <span className="training-lesson-videos__thumb-empty" />
                )}
                <span>
                  <strong>{video.title.trim() || 'بدون عنوان'}</strong>
                  <small>
                    {video.sourceType === 'mp4' ? 'MP4' : 'يوتيوب'} · #
                    {video.displayOrder + 1}
                  </small>
                </span>
              </button>
            );
          })}
        </div>

        {selected ? (
          <div className="training-lesson-videos__form">
            <div className="training-admin-field">
              <label htmlFor={`vid-title-${selected.id}`}>عنوان الفيديو</label>
              <input
                id={`vid-title-${selected.id}`}
                onChange={(event) =>
                  updateSelected({ title: event.target.value })
                }
                value={selected.title}
              />
            </div>
            <div className="training-admin-field">
              <label htmlFor={`vid-desc-${selected.id}`}>وصف مختصر</label>
              <textarea
                id={`vid-desc-${selected.id}`}
                onChange={(event) =>
                  updateSelected({ description: event.target.value })
                }
                rows={2}
                value={selected.description}
              />
            </div>
            {selected.sourceType !== 'mp4' ||
            !selected.youtubeUrl.startsWith('data:') ? (
              <div className="training-admin-field">
                <label htmlFor={`vid-url-${selected.id}`}>الرابط</label>
                <input
                  dir="ltr"
                  id={`vid-url-${selected.id}`}
                  onChange={(event) =>
                    updateSelected({ youtubeUrl: event.target.value })
                  }
                  value={selected.youtubeUrl}
                />
              </div>
            ) : (
              <p className="training-admin-empty">ملف MP4 مرفوع محلياً.</p>
            )}
            <div className="training-admin-actions-row">
              <button
                className="training-admin-btn"
                onClick={() => {
                  const title = window.prompt('تعديل العنوان', selected.title);
                  if (title !== null) updateSelected({ title });
                }}
                type="button"
              >
                <Pencil size={14} /> تعديل
              </button>
              <button
                className="training-admin-btn training-admin-btn--danger"
                onClick={() => {
                  const next = ordered.filter((video) => video.id !== selected.id);
                  commit(next);
                  setSelectedId(next[0]?.id ?? null);
                }}
                type="button"
              >
                <Trash2 size={14} /> حذف الفيديو
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

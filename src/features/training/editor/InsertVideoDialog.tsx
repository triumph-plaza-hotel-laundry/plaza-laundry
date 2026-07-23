import type { Editor } from '@tiptap/react';
import { useEffect, useId, useRef, useState } from 'react';
import { detectVideoSource } from '@/data/training-content';
import { getYoutubeEmbedUrl } from '@/features/training/youtube';

const MAX_MP4_BYTES = 40 * 1024 * 1024;

type InsertVideoDialogProps = {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
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

export function InsertVideoDialog({
  open,
  onClose,
  editor,
}: InsertVideoDialogProps) {
  const titleId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'upload' | 'youtube'>('youtube');
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('youtube');
    setUrl('');
    setStatus(null);
    setBusy(false);
  }, [open]);

  if (!open) {
    return null;
  }

  const insertYoutube = () => {
    if (!editor) return;
    const trimmed = url.trim();
    if (!trimmed) {
      setStatus('أدخل رابط يوتيوب.');
      return;
    }
    const embed = getYoutubeEmbedUrl(trimmed);
    if (!embed) {
      setStatus('رابط يوتيوب غير صالح.');
      return;
    }
    editor
      .chain()
      .focus()
      .setTrainingVideoEmbed({ src: embed, provider: 'youtube' })
      .run();
    onClose();
  };

  const insertMp4File = async (file: File) => {
    if (!editor) return;
    if (!file.type.startsWith('video/') && !file.name.toLowerCase().endsWith('.mp4')) {
      setStatus('يُسمح بملفات الفيديو فقط (MP4).');
      return;
    }
    if (file.size > MAX_MP4_BYTES) {
      setStatus('حجم الفيديو كبير جداً. الحد الأقصى 40 ميجابايت.');
      return;
    }
    setBusy(true);
    setStatus('جاري رفع الفيديو…');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      editor
        .chain()
        .focus()
        .setTrainingVideoEmbed({ src: dataUrl, provider: 'mp4' })
        .run();
      onClose();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'تعذر رفع الفيديو.');
    } finally {
      setBusy(false);
    }
  };

  const insertMp4Url = () => {
    if (!editor) return;
    const trimmed = url.trim();
    if (!trimmed) {
      setStatus('أدخل رابط MP4.');
      return;
    }
    if (detectVideoSource(trimmed) !== 'mp4' && !trimmed.includes('.mp4')) {
      setStatus('الرابط لا يبدو كملف MP4.');
      return;
    }
    editor
      .chain()
      .focus()
      .setTrainingVideoEmbed({ src: trimmed, provider: 'mp4' })
      .run();
    onClose();
  };

  return (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className="training-lux-backdrop"
      dir="rtl"
      lang="ar"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="training-lux-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="training-lux-dialog__header">
          <p className="training-lux-dialog__eyebrow">وسائط</p>
          <h3 id={titleId}>🎥 إضافة فيديو</h3>
        </header>

        <div className="training-lux-tabs">
          <button
            className={mode === 'youtube' ? 'is-active' : ''}
            onClick={() => setMode('youtube')}
            type="button"
          >
            يوتيوب
          </button>
          <button
            className={mode === 'upload' ? 'is-active' : ''}
            onClick={() => setMode('upload')}
            type="button"
          >
            رفع MP4
          </button>
        </div>

        {mode === 'youtube' ? (
          <label className="training-lux-field">
            رابط يوتيوب
            <input
              dir="ltr"
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              value={url}
            />
          </label>
        ) : (
          <div className="training-lux-dialog__stack">
            <button
              className="training-lux-btn training-lux-btn--gold"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              type="button"
            >
              اختر ملف MP4
            </button>
            <input
              accept="video/mp4,video/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void insertMp4File(file);
              }}
              ref={fileRef}
              type="file"
            />
            <label className="training-lux-field">
              أو رابط MP4 مباشر
              <input
                dir="ltr"
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://cdn.example.com/video.mp4"
                value={url}
              />
            </label>
          </div>
        )}

        {status ? <p className="training-lux-status">{status}</p> : null}

        <div className="training-lux-dialog__actions">
          <button
            className="training-lux-btn training-lux-btn--ghost"
            onClick={onClose}
            type="button"
          >
            إلغاء
          </button>
          <button
            className="training-lux-btn training-lux-btn--gold"
            disabled={busy}
            onClick={() => {
              if (mode === 'youtube') insertYoutube();
              else insertMp4Url();
            }}
            type="button"
          >
            إدراج الفيديو
          </button>
        </div>
      </div>
    </div>
  );
}

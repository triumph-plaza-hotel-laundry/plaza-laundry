import type { Editor } from '@tiptap/react';
import { useEffect, useId, useRef, useState } from 'react';
import { optimizeTrainingImage } from '@/features/training/image-optimize';

type InsertImageDialogProps = {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
};

export function InsertImageDialog({
  open,
  onClose,
  editor,
}: InsertImageDialogProps) {
  const titleId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('upload');
    setUrl('');
    setPreview(null);
    setStatus(null);
    setBusy(false);
  }, [open]);

  if (!open) {
    return null;
  }

  const insertSrc = async (src: string) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .setTrainingImage({
        src,
        width: '100%',
        align: 'center',
      })
      .run();
    onClose();
  };

  const handleUpload = async (file: File) => {
    setBusy(true);
    setStatus('جاري تحسين الصورة…');
    try {
      const optimized = await optimizeTrainingImage(file);
      setPreview(optimized.dataUrl);
      setStatus(null);
      await insertSrc(optimized.dataUrl);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'تعذر رفع الصورة.');
    } finally {
      setBusy(false);
    }
  };

  const handleUrlInsert = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setStatus('أدخل رابط الصورة.');
      return;
    }
    setBusy(true);
    try {
      setPreview(trimmed);
      await insertSrc(trimmed);
    } finally {
      setBusy(false);
    }
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
          <h3 id={titleId}>🖼 إضافة صورة</h3>
        </header>

        <div className="training-lux-tabs">
          <button
            className={mode === 'upload' ? 'is-active' : ''}
            onClick={() => setMode('upload')}
            type="button"
          >
            رفع صورة
          </button>
          <button
            className={mode === 'url' ? 'is-active' : ''}
            onClick={() => setMode('url')}
            type="button"
          >
            رابط صورة
          </button>
        </div>

        {mode === 'upload' ? (
          <div className="training-lux-upload">
            <button
              className="training-lux-btn training-lux-btn--gold"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              type="button"
            >
              اختر صورة من الجهاز
            </button>
            <input
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void handleUpload(file);
              }}
              ref={fileRef}
              type="file"
            />
            <p className="training-lux-hint">
              يتم تحويل الصورة تلقائياً إلى WebP بجودة عالية.
            </p>
          </div>
        ) : (
          <div className="training-lux-dialog__stack">
            <label className="training-lux-field">
              رابط الصورة
              <input
                dir="ltr"
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://..."
                value={url}
              />
            </label>
            {preview || url ? (
              <img
                alt=""
                className="training-lux-media-preview"
                src={preview || url}
              />
            ) : null}
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
          {mode === 'url' ? (
            <button
              className="training-lux-btn training-lux-btn--gold"
              disabled={busy}
              onClick={() => void handleUrlInsert()}
              type="button"
            >
              إدراج الصورة
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

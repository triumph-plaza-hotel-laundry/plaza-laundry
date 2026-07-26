import { Archive, Download, Printer, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type {
  TrainingMonthlyArchiveRecord,
  TrainingRestoreTarget,
} from '@/data/training-cms';
import { listTrainingArchives } from '@/data/repositories/training-archives-repository';
import { restoreTrainingLesson } from '@/data/repositories/training-lessons-repository';
import { restoreTrainingImage } from '@/data/repositories/training-images-repository';
import { restoreTrainingVideo } from '@/data/repositories/training-videos-repository';
import { formatTrainingMonthLabel } from '@/features/training/cms/month-key';

type Props = {
  onChanged: () => void;
  onToast: (message: string, tone: 'success' | 'error') => void;
  assertCanWrite: () => void;
  onDownloadMonth?: (archive: TrainingMonthlyArchiveRecord) => void;
  onPrintMonth?: (archive: TrainingMonthlyArchiveRecord) => void;
};

type RestoreRequest = {
  kind: 'lesson' | 'image' | 'video';
  id: string;
  title: string;
};

export function TrainingArchivesPanel({
  onChanged,
  onToast,
  assertCanWrite,
  onDownloadMonth,
  onPrintMonth,
}: Props) {
  const [archives, setArchives] = useState<TrainingMonthlyArchiveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [restoreReq, setRestoreReq] = useState<RestoreRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const lock = useRef(false);

  const reload = async () => {
    setLoading(true);
    try {
      setArchives(await listTrainingArchives());
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : 'تعذر تحميل الأرشيف',
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

  const runRestore = async (target: TrainingRestoreTarget) => {
    if (!restoreReq || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      assertCanWrite();
      if (restoreReq.kind === 'lesson') {
        await restoreTrainingLesson(restoreReq.id, target);
      } else if (restoreReq.kind === 'image') {
        await restoreTrainingImage(restoreReq.id, target);
      } else {
        await restoreTrainingVideo(restoreReq.id, target);
      }
      onToast('Updated Successfully', 'success');
      setRestoreReq(null);
      await reload();
      onChanged();
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : 'تعذر الاستعادة',
        'error',
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };

  return (
    <section className="training-cms-panel">
      <header className="training-cms-panel__header">
        <div>
          <h2>الأرشيف الشهري</h2>
          <p>لقطات كاملة للدروس والصور والفيديوهات — للقراءة والاستعادة</p>
        </div>
      </header>

      {loading ? (
        <p className="training-cms-empty">جاري التحميل…</p>
      ) : archives.length === 0 ? (
        <p className="training-cms-empty">لا توجد أشهر مؤرشفة بعد</p>
      ) : (
        <div className="training-cms-months">
          {archives.map((archive) => {
            const open = openMonth === archive.archive_month;
            return (
              <section className="training-cms-month" key={archive.archive_month}>
                <button
                  className="training-cms-month__head"
                  onClick={() =>
                    setOpenMonth(open ? null : archive.archive_month)
                  }
                  type="button"
                >
                  <div>
                    <h3>
                      <Archive size={16} />{' '}
                      {formatTrainingMonthLabel(archive.archive_month, 'en')}
                    </h3>
                    <p>
                      {archive.lessons_snapshot.length} lessons ·{' '}
                      {archive.images_snapshot.length} images ·{' '}
                      {archive.videos_snapshot.length} videos
                    </p>
                  </div>
                </button>
                {open ? (
                  <div className="training-cms-month__body training-cms-archive-body">
                    <div className="training-cms-gallery__actions">
                      <button
                        className="training-admin-btn"
                        disabled={exportBusy || !archive.lessons_snapshot.length}
                        onClick={() => {
                          setExportBusy(true);
                          try {
                            onDownloadMonth?.(archive);
                          } finally {
                            window.setTimeout(() => setExportBusy(false), 800);
                          }
                        }}
                        type="button"
                      >
                        <Download size={16} /> Download Month
                      </button>
                      <button
                        className="training-admin-btn"
                        disabled={
                          exportBusy || !archive.lessons_snapshot.length
                        }
                        onClick={() => onPrintMonth?.(archive)}
                        type="button"
                      >
                        <Printer size={16} /> Print Month
                      </button>
                    </div>

                    <h4>Lessons</h4>
                    {archive.lessons_snapshot.length === 0 ? (
                      <p className="training-cms-empty">لا دروس</p>
                    ) : (
                      archive.lessons_snapshot.map((lesson) => (
                        <div className="training-cms-archive-row" key={lesson.id}>
                          <span>{lesson.title || 'Untitled'}</span>
                          <button
                            className="training-admin-btn"
                            disabled={busy}
                            onClick={() =>
                              setRestoreReq({
                                kind: 'lesson',
                                id: lesson.id,
                                title: lesson.title || 'Untitled',
                              })
                            }
                            type="button"
                          >
                            <RotateCcw size={14} /> Restore
                          </button>
                        </div>
                      ))
                    )}

                    <h4>Images</h4>
                    {archive.images_snapshot.length === 0 ? (
                      <p className="training-cms-empty">لا صور</p>
                    ) : (
                      archive.images_snapshot.map((image) => (
                        <div className="training-cms-archive-row" key={image.id}>
                          <span>{image.title || 'Untitled'}</span>
                          <button
                            className="training-admin-btn"
                            disabled={busy}
                            onClick={() =>
                              setRestoreReq({
                                kind: 'image',
                                id: image.id,
                                title: image.title || 'Untitled',
                              })
                            }
                            type="button"
                          >
                            <RotateCcw size={14} /> Restore
                          </button>
                        </div>
                      ))
                    )}

                    <h4>Videos</h4>
                    {archive.videos_snapshot.length === 0 ? (
                      <p className="training-cms-empty">لا فيديوهات</p>
                    ) : (
                      archive.videos_snapshot.map((video) => (
                        <div className="training-cms-archive-row" key={video.id}>
                          <span>{video.title || 'Untitled'}</span>
                          <button
                            className="training-admin-btn"
                            disabled={busy}
                            onClick={() =>
                              setRestoreReq({
                                kind: 'video',
                                id: video.id,
                                title: video.title || 'Untitled',
                              })
                            }
                            type="button"
                          >
                            <RotateCcw size={14} /> Restore
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      {restoreReq ? (
        <div
          aria-modal="true"
          className="training-dialog-backdrop"
          onClick={() => !busy && setRestoreReq(null)}
          role="dialog"
        >
          <div
            className="training-cms-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="training-cms-dialog__header">
              <h3>استعادة: {restoreReq.title}</h3>
              <button
                className="training-admin-btn"
                disabled={busy}
                onClick={() => setRestoreReq(null)}
                type="button"
              >
                <X size={16} />
              </button>
            </header>
            <div className="training-cms-dialog__body">
              <p className="training-cms-empty" style={{ padding: 0 }}>
                Restore to:
              </p>
              <button
                className="training-admin-btn training-admin-btn--primary"
                disabled={busy}
                onClick={() => void runRestore('original')}
                type="button"
              >
                Original Month
              </button>
              <button
                className="training-admin-btn training-admin-btn--primary"
                disabled={busy}
                onClick={() => void runRestore('current')}
                type="button"
              >
                Current Month
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

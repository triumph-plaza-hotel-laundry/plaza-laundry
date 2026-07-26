import { Archive, Download, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
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

function askRestoreTarget(): TrainingRestoreTarget | null {
  const choice = window.prompt(
    'Restore to:\n1 = Original Month\n2 = Current Month\n\nEnter 1 or 2:',
    '2',
  );
  if (choice === null) return null;
  if (choice.trim() === '1') return 'original';
  if (choice.trim() === '2') return 'current';
  window.alert('Invalid choice. Use 1 or 2.');
  return null;
}

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

  const handleRestoreLesson = async (id: string) => {
    const target = askRestoreTarget();
    if (!target) return;
    try {
      assertCanWrite();
      await restoreTrainingLesson(id, target);
      onToast('Updated Successfully', 'success');
      await reload();
      onChanged();
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : 'تعذر الاستعادة',
        'error',
      );
    }
  };

  const handleRestoreImage = async (id: string) => {
    const target = askRestoreTarget();
    if (!target) return;
    try {
      assertCanWrite();
      await restoreTrainingImage(id, target);
      onToast('Updated Successfully', 'success');
      await reload();
      onChanged();
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : 'تعذر الاستعادة',
        'error',
      );
    }
  };

  const handleRestoreVideo = async (id: string) => {
    const target = askRestoreTarget();
    if (!target) return;
    try {
      assertCanWrite();
      await restoreTrainingVideo(id, target);
      onToast('Updated Successfully', 'success');
      await reload();
      onChanged();
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : 'تعذر الاستعادة',
        'error',
      );
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
                        onClick={() => onDownloadMonth?.(archive)}
                        type="button"
                      >
                        <Download size={16} /> Download Month
                      </button>
                      <button
                        className="training-admin-btn"
                        onClick={() => onPrintMonth?.(archive)}
                        type="button"
                      >
                        Print Month
                      </button>
                    </div>

                    <h4>Lessons</h4>
                    {archive.lessons_snapshot.map((lesson) => (
                      <div className="training-cms-archive-row" key={lesson.id}>
                        <span>{lesson.title || 'Untitled'}</span>
                        <button
                          className="training-admin-btn"
                          onClick={() => void handleRestoreLesson(lesson.id)}
                          type="button"
                        >
                          <RotateCcw size={14} /> Restore
                        </button>
                      </div>
                    ))}

                    <h4>Images</h4>
                    {archive.images_snapshot.map((image) => (
                      <div className="training-cms-archive-row" key={image.id}>
                        <span>{image.title || 'Untitled'}</span>
                        <button
                          className="training-admin-btn"
                          onClick={() => void handleRestoreImage(image.id)}
                          type="button"
                        >
                          <RotateCcw size={14} /> Restore
                        </button>
                      </div>
                    ))}

                    <h4>Videos</h4>
                    {archive.videos_snapshot.map((video) => (
                      <div className="training-cms-archive-row" key={video.id}>
                        <span>{video.title || 'Untitled'}</span>
                        <button
                          className="training-admin-btn"
                          onClick={() => void handleRestoreVideo(video.id)}
                          type="button"
                        >
                          <RotateCcw size={14} /> Restore
                        </button>
                      </div>
                    ))}
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

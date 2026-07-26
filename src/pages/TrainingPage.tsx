import {
  Download,
  Eye,
  FileText,
  Film,
  Image as ImageIcon,
  Printer,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type {
  TrainingImageRecord,
  TrainingLessonRecord,
  TrainingVideoRecord,
} from '@/data/training-cms';
import { listTrainingImages } from '@/data/repositories/training-images-repository';
import { listTrainingVideos } from '@/data/repositories/training-videos-repository';
import { listTrainingLessons } from '@/data/repositories/training-lessons-repository';
import {
  formatTrainingMonthLabel,
  getCurrentTrainingMonthKey,
} from '@/features/training/cms/month-key';
import {
  buildPrintableTableHtml,
  EnterprisePrintButton,
} from '@/features/enterprise-print';
import { downloadLessonDocx } from '@/features/training/export/download-lesson-docx';
import { downloadLessonsPdf } from '@/features/training/export/download-lesson-pdf';
import {
  downloadUrl,
  printTrainingLessons,
} from '@/features/training/export/print-lesson';
import { getYoutubeEmbedUrl } from '@/features/training/youtube';
import { useAuth } from '@/hooks';
import '@/components/training/training-page.css';
import '@/features/training/public/training-public.css';
import '@/features/training/admin/training-admin.css';

const TrainingLessonContent = lazy(() =>
  import('@/features/training/public/TrainingLessonContent').then((module) => ({
    default: module.TrainingLessonContent,
  })),
);

type PublicTab = 'lessons' | 'images' | 'videos';

export function TrainingPage() {
  const { user } = useAuth();
  const isAdmin = Boolean(
    user && ['OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(user.role),
  );
  const [tab, setTab] = useState<PublicTab>('lessons');
  const [images, setImages] = useState<TrainingImageRecord[]>([]);
  const [videos, setVideos] = useState<TrainingVideoRecord[]>([]);
  const [lessons, setLessons] = useState<TrainingLessonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<TrainingImageRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const currentMonth = getCurrentTrainingMonthKey();

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [imgs, vids, less] = await Promise.all([
          listTrainingImages('active'),
          listTrainingVideos('active'),
          listTrainingLessons({
            status: 'active',
            visibility: isAdmin ? 'all' : 'visible',
          }),
        ]);
        setImages(imgs);
        setVideos(vids);
        setLessons(less);
        setOpenMonths({ [currentMonth]: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [currentMonth, isAdmin]);

  const months = useMemo(() => {
    const map = new Map<string, TrainingLessonRecord[]>();
    for (const lesson of lessons) {
      const list = map.get(lesson.month_key) ?? [];
      list.push(lesson);
      map.set(lesson.month_key, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [lessons]);

  const runExport = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="training-page training-cms-public" dir="rtl" lang="ar">
      <header className="training-page__hero">
        <p className="training-page__eyebrow">Triumph Plaza Hotel Laundry</p>
        <h1>مركز التدريب</h1>
        <p>دروس · صور · فيديوهات</p>
      </header>

      <nav className="training-cms-tabs" aria-label="أقسام التدريب">
        <button
          className={tab === 'lessons' ? 'training-cms-tabs__btn is-active' : 'training-cms-tabs__btn'}
          onClick={() => setTab('lessons')}
          type="button"
        >
          <FileText size={16} /> الدروس
        </button>
        <button
          className={tab === 'images' ? 'training-cms-tabs__btn is-active' : 'training-cms-tabs__btn'}
          onClick={() => setTab('images')}
          type="button"
        >
          <ImageIcon size={16} /> الصور
        </button>
        <button
          className={tab === 'videos' ? 'training-cms-tabs__btn is-active' : 'training-cms-tabs__btn'}
          onClick={() => setTab('videos')}
          type="button"
        >
          <Film size={16} /> الفيديوهات
        </button>
      </nav>

      {loading ? <p className="training-cms-empty">جاري التحميل…</p> : null}

      {!loading && tab === 'images' ? (
        <div className="training-cms-gallery">
          <div className="training-cms-tab-print">
            <EnterprisePrintButton
              dir="rtl"
              disabled={images.length === 0}
              getSource={() =>
                buildPrintableTableHtml({
                  headers: ['Title', 'Description', 'Month', 'URL'],
                  rows: images.map((item) => [
                    item.title,
                    item.description,
                    item.month_key,
                    item.public_url,
                  ]),
                })
              }
              label="Print"
              title="Training Images Gallery"
            />
          </div>
          {images.length === 0 ? (
            <p className="training-cms-empty">لا توجد صور</p>
          ) : (
            images.map((image) => (
              <article className="training-cms-gallery__card" key={image.id}>
                <button
                  className="training-cms-gallery__thumb"
                  onClick={() => setLightbox(image)}
                  type="button"
                >
                  <img alt={image.title} loading="lazy" src={image.public_url} />
                </button>
                <div className="training-cms-gallery__meta">
                  <h3>{image.title}</h3>
                  {image.description ? <p>{image.description}</p> : null}
                  <button
                    className="training-admin-btn"
                    disabled={busyId === image.id}
                    onClick={() =>
                      void runExport(image.id, () =>
                        downloadUrl(
                          `${image.title || 'image'}.jpg`,
                          image.public_url,
                        ),
                      )
                    }
                    type="button"
                  >
                    <Download size={16} /> تحميل
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      ) : null}

      {!loading && tab === 'videos' ? (
        <div className="training-cms-videos">
          <div className="training-cms-tab-print">
            <EnterprisePrintButton
              dir="rtl"
              disabled={videos.length === 0}
              getSource={() =>
                buildPrintableTableHtml({
                  headers: ['Title', 'Description', 'Type', 'Media'],
                  rows: videos.map((item) => [
                    item.title,
                    item.description,
                    item.source_type,
                    item.media_url,
                  ]),
                })
              }
              label="Print"
              title="Training Videos"
            />
          </div>
          {videos.length === 0 ? (
            <p className="training-cms-empty">لا توجد فيديوهات</p>
          ) : (
            videos.map((video) => {
              const embed =
                video.source_type === 'youtube'
                  ? getYoutubeEmbedUrl(video.media_url)
                  : null;
              return (
                <article className="training-cms-video-card" key={video.id}>
                  <div className="training-cms-video-card__media">
                    {video.source_type === 'mp4' ? (
                      <video
                        className="training-cms-video-card__player"
                        controls
                        playsInline
                        preload="metadata"
                        src={video.media_url}
                      >
                        <track kind="captions" />
                      </video>
                    ) : embed ? (
                      <iframe
                        allowFullScreen
                        className="training-cms-video-card__player"
                        loading="lazy"
                        src={embed}
                        title={video.title}
                      />
                    ) : null}
                  </div>
                  <div className="training-cms-video-card__meta">
                    <h3>{video.title}</h3>
                    {video.description ? <p>{video.description}</p> : null}
                    {video.source_type === 'mp4' ? (
                      <button
                        className="training-admin-btn"
                        disabled={busyId === video.id}
                        onClick={() =>
                          void runExport(video.id, () =>
                            downloadUrl(
                              `${video.title || 'video'}.mp4`,
                              video.media_url,
                            ),
                          )
                        }
                        type="button"
                      >
                        <Download size={16} /> تحميل MP4
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      ) : null}

      {!loading && tab === 'lessons' ? (
        <div className="training-cms-months">
          {months.length === 0 ? (
            <p className="training-cms-empty">لا توجد دروس ظاهرة</p>
          ) : (
            months.map(([monthKey, monthLessons]) => {
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
                  </button>
                  {open ? (
                    <div className="training-cms-month__body">
                      {monthLessons.map((lesson) => {
                        const expanded = openLessonId === lesson.id;
                        return (
                          <article
                            className={`training-cms-lesson-card${expanded ? ' is-open' : ''}`}
                            key={lesson.id}
                          >
                            <button
                              className="training-cms-lesson-card__toggle"
                              onClick={() =>
                                setOpenLessonId(expanded ? null : lesson.id)
                              }
                              style={{ gridColumn: '1 / -1', width: '100%' }}
                              type="button"
                            >
                              <div className="training-cms-lesson-card__titles">
                                <h3>{lesson.title}</h3>
                                <p>
                                  {new Date(
                                    lesson.updated_at,
                                  ).toLocaleDateString('ar-EG')}
                                </p>
                              </div>
                              <Eye size={16} />
                            </button>
                            {expanded ? (
                              <div className="training-cms-lesson-card__body">
                                <Suspense
                                  fallback={
                                    <p className="training-cms-empty">…</p>
                                  }
                                >
                                  <TrainingLessonContent
                                    html={lesson.content_html}
                                  />
                                </Suspense>
                                <div className="training-cms-gallery__actions">
                                  <button
                                    className="training-admin-btn"
                                    disabled={busyId === `${lesson.id}-pdf`}
                                    onClick={() =>
                                      void runExport(`${lesson.id}-pdf`, () =>
                                        downloadLessonsPdf(
                                          [lesson],
                                          `${lesson.title || 'lesson'}.pdf`,
                                        ),
                                      )
                                    }
                                    type="button"
                                  >
                                    <Download size={16} /> PDF
                                  </button>
                                  <button
                                    className="training-admin-btn"
                                    disabled={busyId === `${lesson.id}-docx`}
                                    onClick={() =>
                                      void runExport(`${lesson.id}-docx`, () =>
                                        downloadLessonDocx(lesson),
                                      )
                                    }
                                    type="button"
                                  >
                                    <Download size={16} /> Word
                                  </button>
                                  <button
                                    className="training-admin-btn"
                                    onClick={() =>
                                      printTrainingLessons([lesson], {
                                        printedBy:
                                          user?.displayName ||
                                          user?.username ||
                                          'Staff',
                                      })
                                    }
                                    type="button"
                                  >
                                    <Printer size={16} /> طباعة
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              );
            })
          )}
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

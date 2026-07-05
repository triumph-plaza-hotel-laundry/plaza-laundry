import { motion } from 'framer-motion';
import { BookOpenText, PlayCircle, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTrainingStorage, useLanguage } from '@/hooks';
import '@/components/training/training-page.css';

function getYoutubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1) || null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v');
    }
    return null;
  } catch {
    return null;
  }
}

export function TrainingPage() {
  const { language, t } = useLanguage();
  const { training } = useTrainingStorage();
  const [openSection, setOpenSection] = useState<'written' | 'video' | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [videoTitles, setVideoTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = training.videos
      .map((video) => ({ videoId: video.id, ytId: getYoutubeVideoId(video.youtubeUrl) }))
      .filter((item): item is { videoId: string; ytId: string } => Boolean(item.ytId));

    ids.forEach(({ videoId, ytId }) => {
      fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`)
        .then((res) => res.json())
        .then((data: { title?: string }) => {
          setVideoTitles((prev) => ({ ...prev, [videoId]: data.title ?? '' }));
        })
        .catch(() => {
          setVideoTitles((prev) => ({ ...prev, [videoId]: '' }));
        });
    });
  }, [training.videos]);

  return (
    <section className="training-page mx-auto">
      <header className="training-page__header">
        <span className="training-page__emoji" aria-hidden="true">
          ✦
        </span>
        <h1 className="training-page__title-en">Training</h1>
        <h1 className="training-page__title-ar">التدريب</h1>
      </header>

      {openSection === null ? (
        <div className="training-page__overview">
          <motion.article
            className="training-overview-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setOpenSection('written')}
          >
            <div className="training-overview-card__head">
              <span className="training-overview-card__icon">
                <BookOpenText size={19} />
              </span>
              <div>
                <h2 className="training-overview-card__title-en">{t('training.writtenTitle')}</h2>
                <p className="training-overview-card__title-ar">{t('training.writtenTitleAr')}</p>
              </div>
            </div>
            <p className="training-overview-card__desc">{t('training.writtenHint')}</p>
          </motion.article>

          <motion.article
            className="training-overview-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            onClick={() => setOpenSection('video')}
          >
            <div className="training-overview-card__head">
              <span className="training-overview-card__icon">
                <Video size={19} />
              </span>
              <div>
                <h2 className="training-overview-card__title-en">{t('training.videoTitle')}</h2>
                <p className="training-overview-card__title-ar">{t('training.videoTitleAr')}</p>
              </div>
            </div>
            <p className="training-overview-card__desc">{t('training.videoHint')}</p>
          </motion.article>
        </div>
      ) : null}

      {openSection === 'written' ? (
        <div className="training-panel">
          <div className="training-panel__header">
            <h2>{t('training.writtenLessons')}</h2>
            <button className="training-panel__back" onClick={() => setOpenSection(null)} type="button">
              {t('training.back')}
            </button>
          </div>
          <div className="training-lessons">
            {training.lessons.map((lesson) => (
              <article className="training-lesson" key={lesson.id}>
                <h3>{language === 'ar' ? lesson.title.ar : lesson.title.en}</h3>
                <p>{language === 'ar' ? lesson.description.ar : lesson.description.en}</p>
                <p className="training-lesson__date">
                  {t('training.lastUpdated')}: {lesson.lastUpdated}
                </p>
                <div
                  className="training-rich"
                  dangerouslySetInnerHTML={{
                    __html: language === 'ar' ? lesson.contentHtml.ar : lesson.contentHtml.en,
                  }}
                />
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {openSection === 'video' ? (
        <div className="training-panel">
          <div className="training-panel__header">
            <h2>{t('training.videoLessons')}</h2>
            <button className="training-panel__back" onClick={() => setOpenSection(null)} type="button">
              {t('training.back')}
            </button>
          </div>
          <div className="training-videos">
            {training.videos.map((video) => {
              const ytId = getYoutubeVideoId(video.youtubeUrl);
              const thumbnail = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '';
              const title = videoTitles[video.id] ?? '';
              return (
                <article className="training-video" key={video.id}>
                  {thumbnail ? <img alt="" className="training-video__thumb" src={thumbnail} /> : null}
                  <h3>{title || (language === 'ar' ? 'فيديو تدريبي' : 'Training Video')}</h3>
                  <p>{language === 'ar' ? video.description.ar : video.description.en}</p>
                  <p className="training-video__meta">{video.duration}</p>
                  <button
                    className="training-video__play"
                    onClick={() => setPlayingVideoId(playingVideoId === video.id ? null : video.id)}
                    type="button"
                  >
                    <PlayCircle size={15} /> {t('training.play')}
                  </button>
                  {playingVideoId === video.id && ytId ? (
                    <iframe
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="training-video__player"
                      src={`https://www.youtube.com/embed/${ytId}`}
                      title={title || 'training video'}
                    />
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

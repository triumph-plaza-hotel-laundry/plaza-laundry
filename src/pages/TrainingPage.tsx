import { PlayCircle } from 'lucide-react';
import { lazy, Suspense, useMemo, useState } from 'react';
import {
  isTrainingContentEmpty,
  type TrainingLesson,
  type TrainingVideo,
} from '@/data/training-content';
import { useTrainingStorage } from '@/hooks';
import {
  getYoutubeEmbedUrl,
  getYoutubeThumbnail,
  getYoutubeVideoId,
} from '@/features/training/youtube';
import '@/components/training/training-page.css';
import '@/features/training/public/training-public.css';

const TrainingLessonContent = lazy(() =>
  import('@/features/training/public/TrainingLessonContent').then((module) => ({
    default: module.TrainingLessonContent,
  })),
);

function TrainingVideoPlayer({ video }: { video: TrainingVideo }) {
  const [playing, setPlaying] = useState(false);
  const title = video.title.trim() || 'فيديو تدريبي';
  const description = video.description.trim();
  const ytId = getYoutubeVideoId(video.youtubeUrl);
  const thumbnail =
    video.thumbnailUrl || (ytId ? getYoutubeThumbnail(video.youtubeUrl) : '');
  const embedUrl = getYoutubeEmbedUrl(video.youtubeUrl);
  const isMp4 = video.sourceType === 'mp4';

  return (
    <article className="training-video">
      {!playing && thumbnail ? (
        <img
          alt=""
          className="training-video__thumb"
          decoding="async"
          loading="lazy"
          src={thumbnail}
        />
      ) : null}
      <h4>{title}</h4>
      {description ? <p>{description}</p> : null}
      {video.duration ? (
        <p className="training-video__meta">{video.duration}</p>
      ) : null}
      {!playing ? (
        <button
          className="training-video__play"
          onClick={() => setPlaying(true)}
          type="button"
        >
          <PlayCircle size={15} /> تشغيل
        </button>
      ) : isMp4 ? (
        <video
          autoPlay
          className="training-video__player"
          controls
          playsInline
          poster={thumbnail || undefined}
          preload="metadata"
          src={video.youtubeUrl}
        >
          <track kind="captions" />
        </video>
      ) : embedUrl ? (
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="training-video__player"
          loading="lazy"
          src={embedUrl}
          title={title}
        />
      ) : null}
    </article>
  );
}

function LessonView({ lesson }: { lesson: TrainingLesson }) {
  const hasContent = !isTrainingContentEmpty(lesson.contentHtml);
  const videos = useMemo(
    () =>
      [...(lesson.videos ?? [])]
        .filter((video) => video.active !== false && video.youtubeUrl.trim())
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [lesson.videos],
  );

  return (
    <article className="training-lesson">
      <h3>{lesson.title}</h3>
      {lesson.lastUpdated ? (
        <p className="training-lesson__date">آخر تحديث: {lesson.lastUpdated}</p>
      ) : null}

      {hasContent ? (
        <Suspense
          fallback={
            <p className="training-lesson__loading">جاري تحميل المحتوى…</p>
          }
        >
          <TrainingLessonContent html={lesson.contentHtml} />
        </Suspense>
      ) : null}

      {videos.length > 0 ? (
        <div className="training-lesson-videos-public">
          {videos.map((video) => (
            <TrainingVideoPlayer key={video.id} video={video} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function TrainingPage() {
  const { training } = useTrainingStorage();

  // Title is required; content and videos are optional.
  const visibleLessons = training.lessons.filter((lesson) =>
    lesson.title.trim(),
  );

  return (
    <section className="training-page mx-auto" dir="rtl" lang="ar">
      <header className="training-page__header">
        <span className="training-page__emoji" aria-hidden="true">
          ✦
        </span>
        <h1 className="training-page__title-ar">التدريب</h1>
      </header>

      <div className="training-panel training-panel--direct">
        <div className="training-lessons">
          {visibleLessons.length === 0 ? (
            <p className="training-empty">لا يوجد محتوى تدريبي حالياً.</p>
          ) : null}
          {visibleLessons.map((lesson) => (
            <LessonView key={lesson.id} lesson={lesson} />
          ))}
        </div>
      </div>
    </section>
  );
}

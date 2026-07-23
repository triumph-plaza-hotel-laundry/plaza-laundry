import { Eye, Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { useDraftState } from '@/features/admin/hooks/useDraftState';
import {
  createEmptyLesson,
  isTrainingContentEmpty,
  lessonHasVideos,
  lessonIsPublishable,
  type TrainingLesson,
} from '@/data/training-content';
import { trainingRepository } from '@/data/repositories';
import { useAuth } from '@/hooks';
import { LessonVideosManager } from '@/features/training/admin/LessonVideosManager';
import { TrainingRichEditor } from '@/features/training/editor/TrainingRichEditor';
import { sanitizeTrainingHtml } from '@/features/training/sanitize';
import {
  getYoutubeEmbedUrl,
  getYoutubeThumbnail,
} from '@/features/training/youtube';
import '@/features/admin/admin-editor.css';
import '@/features/training/admin/training-admin.css';
import '@/features/training/public/training-public.css';

export function AdminTrainingEditorPage() {
  const { assertCan, logAction } = useAuth();
  const { draft, isDirty, setDraft, resetDraft, commitDraft } =
    useDraftState(trainingRepository);
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveNoticeIsError, setSaveNoticeIsError] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const lesson: TrainingLesson = useMemo(
    () => draft.lessons[0] ?? createEmptyLesson(),
    [draft.lessons],
  );

  const updateLesson = (patch: Partial<TrainingLesson>) => {
    const nextLesson: TrainingLesson = {
      ...lesson,
      ...patch,
      videos: patch.videos ?? lesson.videos ?? [],
      lastUpdated: new Date().toISOString().slice(0, 10),
    };
    setDraft({
      ...draft,
      lessons: [nextLesson],
      videos: [],
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveNotice(null);
    setSaveNoticeIsError(false);
    try {
      assertCan('training', 'update');
      const title = lesson.title.trim();
      const videos = (lesson.videos ?? [])
        .filter((video) => video.youtubeUrl.trim())
        .map((video, index) => ({ ...video, displayOrder: index }));
      const contentHtml = isTrainingContentEmpty(lesson.contentHtml)
        ? ''
        : lesson.contentHtml;

      if (!title) {
        setSaveNotice('عنوان التدريب مطلوب.');
        setSaveNoticeIsError(true);
        return;
      }

      const nextLesson: TrainingLesson = {
        ...lesson,
        title,
        contentHtml,
        videos,
        lastUpdated: new Date().toISOString().slice(0, 10),
      };

      const next = {
        lessons: [nextLesson],
        videos: [],
      };

      await commitDraft(async () => {
        await trainingRepository.replaceAll(next);
        logAction({
          action: 'training.replaceAll',
          page: 'admin/training',
          newValue: next,
        });
      });
      setSaveNotice('تم الحفظ بنجاح');
    } catch (error) {
      setSaveNotice(
        error instanceof Error ? error.message : 'تعذر الحفظ. حاول مرة أخرى.',
      );
      setSaveNoticeIsError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      'هل تريد حذف محتوى التدريب بالكامل؟ اضغط حفظ بعد الحذف لتثبيت التغيير.',
    );
    if (!confirmed) {
      return;
    }
    setDraft({ lessons: [], videos: [] });
    setSaveNotice('تم مسح المحتوى — اضغط حفظ لتثبيت الحذف');
    setSaveNoticeIsError(false);
  };

  const showContentInPreview = !isTrainingContentEmpty(lesson.contentHtml);
  const previewVideos = (lesson.videos ?? []).filter(
    (video) => video.active !== false && video.youtubeUrl.trim(),
  );

  return (
    <section
      className="admin-editor-page training-admin-page training-admin-page--ar mx-auto"
      dir="rtl"
      lang="ar"
    >
      <AdminPageHeader
        subtitle="عنوان مطلوب — المحتوى والصور والجداول والفيديوهات اختيارية"
        titleAr="إدارة التدريب"
        titleEn="إدارة التدريب"
      />

      <div
        className="training-admin-actions"
        role="toolbar"
        aria-label="أدوات التدريب"
      >
        <p
          className={`training-admin-actions__hint${saveNoticeIsError ? ' is-error' : ''}${saveNotice && !saveNoticeIsError ? ' is-success' : ''}`}
        >
          {saveNotice ??
            (isDirty ? 'هناك تغييرات غير محفوظة' : 'جميع التغييرات محفوظة')}
        </p>
        <div className="training-admin-actions__buttons">
          <button
            className="training-admin-btn"
            onClick={() => setPreviewOpen(true)}
            type="button"
          >
            <Eye size={16} /> معاينة
          </button>
          <button
            className="training-admin-btn training-admin-btn--danger"
            onClick={handleDelete}
            type="button"
          >
            <Trash2 size={16} /> حذف
          </button>
          <button
            className="training-admin-btn training-admin-btn--primary"
            disabled={!isDirty || isSaving || !lessonIsPublishable(lesson)}
            onClick={() => void handleSave()}
            type="button"
          >
            <Save size={16} /> {isSaving ? 'جاري الحفظ…' : 'حفظ'}
          </button>
          {isDirty ? (
            <button
              className="training-admin-btn"
              disabled={isSaving}
              onClick={() => {
                resetDraft();
                setSaveNotice(null);
                setSaveNoticeIsError(false);
              }}
              type="button"
            >
              إلغاء
            </button>
          ) : null}
        </div>
      </div>

      <section className="training-admin-section training-admin-section--simple training-admin-section--lux">
        <div className="training-admin-field">
          <label htmlFor="training-title-ar">
            عنوان التدريب <span className="training-required">*</span>
          </label>
          <input
            dir="rtl"
            id="training-title-ar"
            onChange={(event) => updateLesson({ title: event.target.value })}
            placeholder="اكتب عنوان التدريب هنا (مطلوب)"
            required
            value={lesson.title}
          />
        </div>

        <div className="training-admin-field">
          <label>المحرر الفاخر — المحتوى والصور والجداول والفيديو داخل الدرس (اختياري)</label>
          <TrainingRichEditor
            key={lesson.id}
            onChange={(html) => updateLesson({ contentHtml: html })}
            placeholder="يمكنك ترك المحتوى فارغاً… أو إدراج صور وجداول وفيديوهات من الشريط أعلاه"
            value={lesson.contentHtml}
          />
        </div>

        <LessonVideosManager
          onChange={(videos) => updateLesson({ videos })}
          videos={lesson.videos ?? []}
        />
      </section>

      {previewOpen ? (
        <div
          aria-modal="true"
          className="training-dialog-backdrop"
          onClick={() => setPreviewOpen(false)}
          role="dialog"
        >
          <div
            className="training-preview-dialog"
            dir="rtl"
            lang="ar"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="training-preview-dialog__header">
              <h2>معاينة التدريب</h2>
              <button
                className="training-admin-btn"
                onClick={() => setPreviewOpen(false)}
                type="button"
              >
                إغلاق
              </button>
            </header>
            <article className="training-preview-dialog__body">
              <h3>{lesson.title.trim() || 'بدون عنوان'}</h3>
              {showContentInPreview ? (
                <div
                  className="training-rich"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeTrainingHtml(lesson.contentHtml),
                  }}
                />
              ) : null}
              {previewVideos.length > 0 ? (
                <div className="training-lesson-videos-public">
                  {previewVideos.map((video) => {
                    const thumb =
                      video.thumbnailUrl ||
                      getYoutubeThumbnail(video.youtubeUrl);
                    const embed = getYoutubeEmbedUrl(video.youtubeUrl);
                    const isMp4 = video.sourceType === 'mp4';
                    return (
                      <div className="training-video" key={video.id}>
                        {video.title ? <h4>{video.title}</h4> : null}
                        {video.description ? <p>{video.description}</p> : null}
                        {isMp4 ? (
                          <video
                            className="training-video__player"
                            controls
                            playsInline
                            poster={thumb || undefined}
                            preload="metadata"
                            src={video.youtubeUrl}
                          >
                            <track kind="captions" />
                          </video>
                        ) : embed ? (
                          <iframe
                            allowFullScreen
                            className="training-video__player"
                            loading="lazy"
                            src={embed}
                            title={video.title || 'فيديو'}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : !showContentInPreview && !lessonHasVideos(lesson) ? (
                <p className="training-empty">لا يوجد محتوى إضافي بعد.</p>
              ) : null}
            </article>
          </div>
        </div>
      ) : null}
    </section>
  );
}

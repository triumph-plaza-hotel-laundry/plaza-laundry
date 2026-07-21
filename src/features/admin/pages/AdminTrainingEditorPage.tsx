import { useState } from 'react';
import { AdminEditToolbar } from '@/features/admin/components/AdminEditToolbar';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { useDraftState } from '@/features/admin/hooks/useDraftState';
import {
  trainingRepository,
  type TrainingLesson,
  type TrainingVideo,
} from '@/data/repositories';
import { useAuth, useLanguage } from '@/hooks';
import '@/features/admin/admin-editor.css';

function emptyLesson(): TrainingLesson {
  return {
    id: `lesson-${Date.now()}`,
    title: { en: '', ar: '' },
    description: { en: '', ar: '' },
    contentHtml: { en: '', ar: '' },
    lastUpdated: new Date().toISOString().slice(0, 10),
  };
}

function emptyVideo(): TrainingVideo {
  return {
    id: `video-${Date.now()}`,
    youtubeUrl: '',
    duration: '',
    description: { en: '', ar: '' },
  };
}

export function AdminTrainingEditorPage() {
  const { t } = useLanguage();
  const { assertCan, logAction } = useAuth();
  const { draft, isDirty, setDraft, resetDraft, commitDraft } =
    useDraftState(trainingRepository);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(
    draft.lessons[0]?.id ?? null,
  );
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveNoticeIsError, setSaveNoticeIsError] = useState(false);

  const selectedLesson =
    draft.lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;
  const selectedVideo =
    draft.videos.find((video) => video.id === selectedVideoId) ?? null;

  const handleSave = async () => {
    setIsSaving(true);
    setSaveNotice(null);
    setSaveNoticeIsError(false);
    try {
      assertCan('training', 'update');
      await commitDraft(async (value) => {
        await trainingRepository.replaceAll(value);
        logAction({
          action: 'training.replaceAll',
          page: 'admin/training',
          newValue: value,
        });
      });
      setSaveNotice(t('admin.editor.saveSuccess'));
    } catch (error) {
      setSaveNotice(
        error instanceof Error ? error.message : t('admin.editor.saveError'),
      );
      setSaveNoticeIsError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const updateLesson = (patch: Partial<TrainingLesson>) => {
    if (!selectedLesson) {
      return;
    }

    setDraft({
      ...draft,
      lessons: draft.lessons.map((lesson) =>
        lesson.id === selectedLesson.id ? { ...lesson, ...patch } : lesson,
      ),
    });
  };

  const updateVideo = (patch: Partial<TrainingVideo>) => {
    if (!selectedVideo) {
      return;
    }

    setDraft({
      ...draft,
      videos: draft.videos.map((video) =>
        video.id === selectedVideo.id ? { ...video, ...patch } : video,
      ),
    });
  };

  return (
    <section className="admin-editor-page mx-auto">
      <AdminPageHeader
        subtitle={t('admin.editor.trainingSubtitle')}
        titleAr="إدارة التدريب"
        titleEn="Manage Training"
      />
      <AdminEditToolbar
        isDirty={isDirty}
        isSaving={isSaving}
        notice={saveNotice}
        noticeIsError={saveNoticeIsError}
        onCancel={resetDraft}
        onSave={() => void handleSave()}
      />

      <div className="admin-editor-grid admin-editor-grid--2">
        <div className="admin-editor-panel">
          <h3>{t('training.writtenLessons')}</h3>
          <div className="admin-editor-actions-row">
            <button
              className="admin-editor-btn"
              onClick={() => {
                const next = emptyLesson();
                setDraft({ ...draft, lessons: [next, ...draft.lessons] });
                setSelectedLessonId(next.id);
              }}
              type="button"
            >
              {t('admin.editor.add')}
            </button>
            <button
              className="admin-editor-btn admin-editor-btn--danger"
              disabled={!selectedLesson}
              onClick={() => {
                if (!selectedLesson) return;
                setDraft({
                  ...draft,
                  lessons: draft.lessons.filter(
                    (lesson) => lesson.id !== selectedLesson.id,
                  ),
                });
                setSelectedLessonId(
                  draft.lessons.find((l) => l.id !== selectedLesson.id)?.id ??
                    null,
                );
              }}
              type="button"
            >
              {t('admin.editor.delete')}
            </button>
          </div>
          <table className="admin-editor-table">
            <tbody>
              {draft.lessons.map((lesson) => (
                <tr key={lesson.id}>
                  <td>
                    <button
                      className="admin-editor-btn"
                      onClick={() => {
                        setSelectedLessonId(lesson.id);
                        setSelectedVideoId(null);
                      }}
                      type="button"
                    >
                      {lesson.title.en || lesson.id}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedLesson ? (
          <div className="admin-editor-panel admin-editor-grid">
            {(['title', 'description'] as const).flatMap((field) =>
              (['en', 'ar'] as const).map((lang) => (
                <div
                  className="admin-editor-field"
                  key={`lesson-${field}-${lang}`}
                >
                  <label>
                    {field} ({lang.toUpperCase()})
                  </label>
                  <input
                    onChange={(event) =>
                      updateLesson({
                        [field]: {
                          ...selectedLesson[field],
                          [lang]: event.target.value,
                        },
                      })
                    }
                    value={selectedLesson[field][lang]}
                  />
                </div>
              )),
            )}
            {(['en', 'ar'] as const).map((lang) => (
              <div className="admin-editor-field" key={`content-${lang}`}>
                <label>contentHtml ({lang.toUpperCase()})</label>
                <textarea
                  onChange={(event) =>
                    updateLesson({
                      contentHtml: {
                        ...selectedLesson.contentHtml,
                        [lang]: event.target.value,
                      },
                    })
                  }
                  rows={4}
                  value={selectedLesson.contentHtml[lang]}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="admin-editor-grid admin-editor-grid--2">
        <div className="admin-editor-panel">
          <h3>{t('training.videoLessons')}</h3>
          <div className="admin-editor-actions-row">
            <button
              className="admin-editor-btn"
              onClick={() => {
                const next = emptyVideo();
                setDraft({ ...draft, videos: [next, ...draft.videos] });
                setSelectedVideoId(next.id);
                setSelectedLessonId(null);
              }}
              type="button"
            >
              {t('admin.editor.add')}
            </button>
            <button
              className="admin-editor-btn admin-editor-btn--danger"
              disabled={!selectedVideo}
              onClick={() => {
                if (!selectedVideo) return;
                setDraft({
                  ...draft,
                  videos: draft.videos.filter(
                    (video) => video.id !== selectedVideo.id,
                  ),
                });
                setSelectedVideoId(
                  draft.videos.find((v) => v.id !== selectedVideo.id)?.id ??
                    null,
                );
              }}
              type="button"
            >
              {t('admin.editor.delete')}
            </button>
          </div>
          <table className="admin-editor-table">
            <tbody>
              {draft.videos.map((video) => (
                <tr key={video.id}>
                  <td>
                    <button
                      className="admin-editor-btn"
                      onClick={() => {
                        setSelectedVideoId(video.id);
                        setSelectedLessonId(null);
                      }}
                      type="button"
                    >
                      {video.youtubeUrl || video.id}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedVideo ? (
          <div className="admin-editor-panel admin-editor-grid">
            <div className="admin-editor-field">
              <label htmlFor="training-video-url">YouTube URL</label>
              <input
                id="training-video-url"
                onChange={(event) =>
                  updateVideo({ youtubeUrl: event.target.value })
                }
                value={selectedVideo.youtubeUrl}
              />
            </div>
            <div className="admin-editor-field">
              <label>{t('training.fieldDuration')}</label>
              <input
                onChange={(event) =>
                  updateVideo({ duration: event.target.value })
                }
                value={selectedVideo.duration}
              />
            </div>
            {(['en', 'ar'] as const).map((lang) => (
              <div className="admin-editor-field" key={`video-desc-${lang}`}>
                <label>description ({lang.toUpperCase()})</label>
                <textarea
                  onChange={(event) =>
                    updateVideo({
                      description: {
                        ...selectedVideo.description,
                        [lang]: event.target.value,
                      },
                    })
                  }
                  rows={3}
                  value={selectedVideo.description[lang]}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

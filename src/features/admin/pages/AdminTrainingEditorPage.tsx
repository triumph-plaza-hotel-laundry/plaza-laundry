import { useCallback, useEffect, useState } from 'react';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import type { TrainingCmsStats, TrainingSearchHit } from '@/data/training-cms';
import { getTrainingCmsStats } from '@/data/repositories/training-lessons-repository';
import {
  ensureTrainingMonthArchived,
  searchTrainingCms,
} from '@/data/repositories/training-archives-repository';
import { migrateLegacyTrainingIfNeeded } from '@/features/training/cms/migrate-legacy-training';
import { useAuth } from '@/hooks';
import { TrainingArchivesPanel } from '@/features/training/admin/cms/TrainingArchivesPanel';
import { TrainingCmsSearch } from '@/features/training/admin/cms/TrainingCmsSearch';
import { TrainingCmsStatsBar } from '@/features/training/admin/cms/TrainingCmsStatsBar';
import {
  TrainingCmsToast,
  useTrainingToast,
} from '@/features/training/admin/cms/TrainingCmsToast';
import { TrainingImagesPanel } from '@/features/training/admin/cms/TrainingImagesPanel';
import { TrainingLessonsPanel } from '@/features/training/admin/cms/TrainingLessonsPanel';
import { TrainingVideosPanel } from '@/features/training/admin/cms/TrainingVideosPanel';
import { downloadLessonsPdf } from '@/features/training/export/download-lesson-pdf';
import { printTrainingLessons } from '@/features/training/export/print-lesson';
import '@/features/admin/admin-editor.css';
import '@/features/training/admin/training-admin.css';
import '@/features/training/public/training-public.css';

type CmsTab = 'images' | 'videos' | 'lessons' | 'archives';

const TABS: Array<{ id: CmsTab; label: string }> = [
  { id: 'images', label: 'الصور' },
  { id: 'videos', label: 'الفيديوهات' },
  { id: 'lessons', label: 'التدريب المكتوب' },
  { id: 'archives', label: 'الأرشيف' },
];

export function AdminTrainingEditorPage() {
  const { assertCan } = useAuth();
  const { toast, showToast } = useTrainingToast();
  const [tab, setTab] = useState<CmsTab>('lessons');
  const [stats, setStats] = useState<TrainingCmsStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TrainingSearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [focusLessonId, setFocusLessonId] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      setStats(await getTrainingCmsStats());
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await ensureTrainingMonthArchived();
      } catch {
        // Safety-net only; ignore if cron already archived or RPC unavailable.
      }
      try {
        await migrateLegacyTrainingIfNeeded();
      } catch {
        // Non-blocking legacy import.
      }
      await refreshStats();
    })();
  }, [refreshStats]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setSearchLoading(true);
        try {
          const hits = await searchTrainingCms(q);
          if (!cancelled) setSearchResults(hits);
        } catch {
          if (!cancelled) setSearchResults([]);
        } finally {
          if (!cancelled) setSearchLoading(false);
        }
      })();
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  const assertCanWrite = () => {
    assertCan('training', 'update');
  };

  const handleSearchSelect = (hit: TrainingSearchHit) => {
    setSearchQuery('');
    setSearchResults([]);
    if (hit.kind === 'lesson') {
      setTab(hit.archived ? 'archives' : 'lessons');
      setFocusLessonId(hit.record.id);
      return;
    }
    if (hit.kind === 'image') {
      setTab(hit.archived ? 'archives' : 'images');
      return;
    }
    setTab(hit.archived ? 'archives' : 'videos');
  };

  return (
    <section
      className="admin-editor-page training-admin-page training-admin-page--ar training-cms-page mx-auto"
      dir="rtl"
      lang="ar"
    >
      <AdminPageHeader
        subtitle="صور · فيديوهات · دروس مكتوبة — وحدات مستقلة"
        titleAr="إدارة التدريب"
        titleEn="Training CMS"
      />

      <TrainingCmsStatsBar loading={statsLoading} stats={stats} />

      <TrainingCmsSearch
        loading={searchLoading}
        onQueryChange={setSearchQuery}
        onSelect={handleSearchSelect}
        query={searchQuery}
        results={searchResults}
      />

      <nav aria-label="أقسام التدريب" className="training-cms-tabs">
        {TABS.map((item) => (
          <button
            className={
              tab === item.id
                ? 'training-cms-tabs__btn is-active'
                : 'training-cms-tabs__btn'
            }
            key={item.id}
            onClick={() => setTab(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'images' ? (
        <TrainingImagesPanel
          assertCanWrite={assertCanWrite}
          onChanged={() => void refreshStats()}
          onToast={showToast}
        />
      ) : null}
      {tab === 'videos' ? (
        <TrainingVideosPanel
          assertCanWrite={assertCanWrite}
          onChanged={() => void refreshStats()}
          onToast={showToast}
        />
      ) : null}
      {tab === 'lessons' ? (
        <TrainingLessonsPanel
          assertCanWrite={assertCanWrite}
          focusLessonId={focusLessonId}
          onChanged={() => void refreshStats()}
          onToast={showToast}
        />
      ) : null}
      {tab === 'archives' ? (
        <TrainingArchivesPanel
          assertCanWrite={assertCanWrite}
          onChanged={() => void refreshStats()}
          onDownloadMonth={(archive) => {
            void downloadLessonsPdf(
              archive.lessons_snapshot,
              `training-archive-${archive.archive_month}.pdf`,
              {
                heading: `Training Archive ${archive.archive_month}`,
              },
            )
              .then(() => showToast('Saved Successfully', 'success'))
              .catch((error: unknown) =>
                showToast(
                  error instanceof Error ? error.message : 'Download failed',
                  'error',
                ),
              );
          }}
          onPrintMonth={(archive) => {
            printTrainingLessons(archive.lessons_snapshot, {
              heading: `Training Archive ${archive.archive_month}`,
            });
          }}
          onToast={showToast}
        />
      ) : null}

      <TrainingCmsToast toast={toast} />
    </section>
  );
}

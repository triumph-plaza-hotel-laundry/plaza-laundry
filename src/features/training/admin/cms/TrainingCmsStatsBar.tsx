import type { TrainingCmsStats } from '@/data/training-cms';

const CARDS: Array<{
  key: keyof TrainingCmsStats;
  label: string;
}> = [
  { key: 'activeLessons', label: 'دروس نشطة' },
  { key: 'archivedLessons', label: 'مؤرشفة' },
  { key: 'activeImages', label: 'صور' },
  { key: 'activeVideos', label: 'فيديوهات' },
  { key: 'currentMonthLessons', label: 'هذا الشهر' },
];

export function TrainingCmsStatsBar({
  stats,
  loading,
}: {
  stats: TrainingCmsStats | null;
  loading?: boolean;
}) {
  return (
    <div className="training-cms-stats" aria-busy={loading || undefined}>
      {CARDS.map((card) => (
        <article className="training-cms-stat-card" key={card.key}>
          <p className="training-cms-stat-card__label">{card.label}</p>
          <p className="training-cms-stat-card__value">
            {loading || !stats ? '—' : stats[card.key]}
          </p>
        </article>
      ))}
    </div>
  );
}

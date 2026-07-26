import type { TrainingCmsStats } from '@/data/training-cms';

const CARDS: Array<{
  key: keyof TrainingCmsStats;
  labelAr: string;
  labelEn: string;
}> = [
  { key: 'activeLessons', labelAr: 'دروس نشطة', labelEn: 'Active Lessons' },
  { key: 'archivedLessons', labelAr: 'دروس مؤرشفة', labelEn: 'Archived Lessons' },
  { key: 'activeImages', labelAr: 'صور', labelEn: 'Images' },
  { key: 'activeVideos', labelAr: 'فيديوهات', labelEn: 'Videos' },
  {
    key: 'currentMonthLessons',
    labelAr: 'دروس الشهر الحالي',
    labelEn: 'Current Month',
  },
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
          <p className="training-cms-stat-card__label">{card.labelAr}</p>
          <p className="training-cms-stat-card__label-en">{card.labelEn}</p>
          <p className="training-cms-stat-card__value">
            {loading || !stats ? '—' : stats[card.key]}
          </p>
        </article>
      ))}
    </div>
  );
}

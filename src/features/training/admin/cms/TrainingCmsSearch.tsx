import { Search } from 'lucide-react';
import type { TrainingSearchHit } from '@/data/training-cms';

export function TrainingCmsSearch({
  query,
  onQueryChange,
  results,
  loading,
  onSelect,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  results: TrainingSearchHit[];
  loading?: boolean;
  onSelect: (hit: TrainingSearchHit) => void;
}) {
  return (
    <div className="training-cms-search">
      <label className="training-cms-search__label" htmlFor="training-cms-search">
        بحث شامل
      </label>
      <div className="training-cms-search__row">
        <Search aria-hidden size={18} />
        <input
          autoComplete="off"
          id="training-cms-search"
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="ابحث في العناوين والمحتوى والصور والفيديوهات…"
          type="search"
          value={query}
        />
      </div>
      {query.trim() ? (
        <div className="training-cms-search__results" role="listbox">
          {loading ? (
            <p className="training-cms-empty">جاري البحث…</p>
          ) : results.length === 0 ? (
            <p className="training-cms-empty">لا توجد نتائج</p>
          ) : (
            results.map((hit) => {
              const title =
                hit.kind === 'lesson'
                  ? hit.record.title
                  : hit.kind === 'image'
                    ? hit.record.title
                    : hit.record.title;
              const kindLabel =
                hit.kind === 'lesson'
                  ? 'درس'
                  : hit.kind === 'image'
                    ? 'صورة'
                    : 'فيديو';
              return (
                <button
                  className="training-cms-search__hit"
                  key={`${hit.kind}-${hit.record.id}`}
                  onClick={() => onSelect(hit)}
                  role="option"
                  type="button"
                >
                  <span className="training-cms-search__hit-kind">
                    {kindLabel}
                    {hit.archived ? ' · أرشيف' : ''}
                  </span>
                  <span className="training-cms-search__hit-title">
                    {title || 'بدون عنوان'}
                  </span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

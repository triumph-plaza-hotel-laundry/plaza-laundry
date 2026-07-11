import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CareSymbolCard } from '@/components/care-symbols/CareSymbolCard';
import { CareSymbolDetailModal } from '@/components/care-symbols/CareSymbolDetailModal';
import {
  careCatalogFilters,
  matchesCareFilter,
  type CareCatalogFilter,
} from '@/components/care-symbols/care-catalog-utils';
import type { CareLabel } from '@/data/repositories';
import { useCareSymbols, useLanguage } from '@/hooks';
import type { TranslationKey } from '@/types/language';
import '@/components/care-symbols/care-symbols-page.css';

const filterLabelKeys: Record<CareCatalogFilter, TranslationKey> = {
  all: 'care.catalog.filters.all',
  washing: 'care.catalog.filters.washing',
  bleaching: 'care.catalog.filters.bleaching',
  drying: 'care.catalog.filters.drying',
  ironing: 'care.catalog.filters.ironing',
  dryCleaning: 'care.catalog.filters.dryCleaning',
};

export function CareSymbolsPage() {
  const { t } = useLanguage();
  const { careLabels } = useCareSymbols();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<CareCatalogFilter>('all');
  const [selectedLabel, setSelectedLabel] = useState<CareLabel | null>(null);

  const filteredLabels = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return careLabels.filter((label) => {
      if (!matchesCareFilter(label, activeFilter)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        label.name.en,
        label.name.ar,
        label.meaning.en,
        label.meaning.ar,
        label.instructions.en,
        label.instructions.ar,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeFilter, careLabels, searchQuery]);

  return (
    <section className="care-catalog mx-auto">
      <header className="care-catalog__header">
        <div className="care-catalog__title-block">
          <span aria-hidden="true" className="care-catalog__emoji">
            🏷️
          </span>
          <h1 className="care-catalog__title-en">Care Labels</h1>
          <h1 className="care-catalog__title-ar">علامات العناية</h1>
        </div>

        <label className="care-catalog__search">
          <Search
            aria-hidden="true"
            className="care-catalog__search-icon"
            strokeWidth={1.75}
          />
          <input
            className="care-catalog__search-input"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('care.catalog.searchPlaceholder')}
            type="search"
            value={searchQuery}
          />
        </label>

        <div
          aria-label={t('care.catalog.filtersLabel')}
          className="care-catalog__filters"
          role="group"
        >
          {careCatalogFilters.map((filter) => (
            <button
              className={`care-catalog__filter${activeFilter === filter ? 'care-catalog__filter--active' : ''}`}
              key={filter}
              onClick={() => setActiveFilter(filter)}
              type="button"
            >
              {t(filterLabelKeys[filter])}
            </button>
          ))}
        </div>
      </header>

      {filteredLabels.length > 0 ? (
        <div className="care-catalog__grid">
          {filteredLabels.map((label) => (
            <CareSymbolCard
              key={label.id}
              label={label}
              onSelect={setSelectedLabel}
            />
          ))}
        </div>
      ) : (
        <div className="care-catalog__empty">
          <p className="care-catalog__empty-en">
            {t('care.catalog.noResults')}
          </p>
          <p className="care-catalog__empty-ar">
            {t('care.catalog.noResultsAr')}
          </p>
        </div>
      )}

      <CareSymbolDetailModal
        label={selectedLabel}
        onClose={() => setSelectedLabel(null)}
      />
    </section>
  );
}

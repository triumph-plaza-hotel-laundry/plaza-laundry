import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { StainCard } from '@/components/stains/StainCard';
import { StainDetailModal } from '@/components/stains/StainDetailModal';
import {
  matchesStainFilter,
  stainCatalogFilters,
  type StainCatalogFilter,
} from '@/components/stains/stain-catalog-utils';
import type { LaundryStain } from '@/data/repositories';
import { useLanguage, useStains } from '@/hooks';
import type { TranslationKey } from '@/types/language';
import '@/components/stains/stains-page.css';

const filterLabelKeys: Record<StainCatalogFilter, TranslationKey> = {
  all: 'stains.catalog.filters.all',
  beverage: 'stains.catalog.filters.beverage',
  food: 'stains.catalog.filters.food',
  body: 'stains.catalog.filters.body',
  oilFat: 'stains.catalog.filters.oilFat',
  cosmetic: 'stains.catalog.filters.cosmetic',
  outdoor: 'stains.catalog.filters.outdoor',
  industrial: 'stains.catalog.filters.industrial',
  household: 'stains.catalog.filters.household',
  chemical: 'stains.catalog.filters.chemical',
};

export function StainsPage() {
  const { t } = useLanguage();
  const { stains } = useStains();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<StainCatalogFilter>('all');
  const [selectedStain, setSelectedStain] = useState<LaundryStain | null>(null);

  const filteredStains = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return stains.filter((stain) => {
      if (!matchesStainFilter(stain, activeFilter)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [stain.name.en, stain.name.ar, stain.description.en, stain.description.ar]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeFilter, searchQuery, stains]);

  return (
    <section className="stains-catalog mx-auto">
      <header className="stains-catalog__header">
        <div className="stains-catalog__title-block">
          <span aria-hidden="true" className="stains-catalog__emoji">
            ✦
          </span>
          <h1 className="stains-catalog__title-en">Stain Treatment Guide</h1>
          <h1 className="stains-catalog__title-ar">دليل معالجة البقع</h1>
          <p className="stains-catalog__subtitle-en">
            Premium reference for Triumph Plaza Hotel laundry operations
          </p>
          <p className="stains-catalog__subtitle-ar">مرجع فاخر لعمليات غسيل فندق تريومف بلازا</p>
        </div>

        <label className="stains-catalog__search">
          <Search aria-hidden="true" className="stains-catalog__search-icon" strokeWidth={1.75} />
          <input
            className="stains-catalog__search-input"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('stains.catalog.searchPlaceholder')}
            type="search"
            value={searchQuery}
          />
        </label>

        <div aria-label={t('stains.catalog.filtersLabel')} className="stains-catalog__filters" role="group">
          {stainCatalogFilters.map((filter) => (
            <button
              className={`stains-catalog__filter${activeFilter === filter ? ' stains-catalog__filter--active' : ''}`}
              key={filter}
              onClick={() => setActiveFilter(filter)}
              type="button"
            >
              {t(filterLabelKeys[filter])}
            </button>
          ))}
        </div>

        <p className="stains-catalog__count">
          {t('stains.catalog.count').replace('{count}', String(filteredStains.length))}
        </p>
      </header>

      {filteredStains.length > 0 ? (
        <div className="stains-catalog__grid">
          {filteredStains.map((stain) => (
            <StainCard key={stain.id} onSelect={setSelectedStain} stain={stain} />
          ))}
        </div>
      ) : (
        <div className="stains-catalog__empty">
          <p className="stains-catalog__empty-en">{t('stains.catalog.noResults')}</p>
          <p className="stains-catalog__empty-ar">{t('stains.catalog.noResultsAr')}</p>
        </div>
      )}

      <StainDetailModal onClose={() => setSelectedStain(null)} stain={selectedStain} />
    </section>
  );
}

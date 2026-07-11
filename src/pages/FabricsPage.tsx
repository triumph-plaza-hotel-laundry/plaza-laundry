import { Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { FabricCatalogCard } from '@/components/fabrics/FabricCatalogCard';
import { FabricDetailModal } from '@/components/fabrics/FabricDetailModal';
import {
  catalogFilters,
  matchesCatalogFilter,
  type CatalogFilter,
} from '@/components/fabrics/fabric-catalog-utils';
import type { LaundryFabric } from '@/data/repositories';
import {
  useFabricFavorites,
  useFabrics,
  useHomeContent,
  useLanguage,
  useRecentlyViewedFabrics,
} from '@/hooks';
import { dictionaries } from '@/i18n/dictionaries';
import '@/components/fabrics/fabrics-page.css';
import type { TranslationKey } from '@/types/language';

const filterLabelKeys: Record<CatalogFilter, TranslationKey> = {
  all: 'fabrics.catalog.filters.all',
  natural: 'fabrics.catalog.filters.natural',
  synthetic: 'fabrics.catalog.filters.synthetic',
  luxury: 'fabrics.catalog.filters.luxury',
  hotelLinen: 'fabrics.catalog.filters.hotelLinen',
  uniform: 'fabrics.catalog.filters.uniform',
  delicate: 'fabrics.catalog.filters.delicate',
};

export function FabricsPage() {
  const { t } = useLanguage();
  const { fabrics } = useFabrics();
  const { content } = useHomeContent();
  const { favorites, isFavorite, toggleFavorite } = useFabricFavorites();
  const { recentIds, trackView } = useRecentlyViewedFabrics();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<CatalogFilter>('all');
  const [selectedFabric, setSelectedFabric] = useState<LaundryFabric | null>(
    null,
  );

  const handleSelectFabric = useCallback(
    (fabric: LaundryFabric) => {
      trackView(fabric.id);
      setSelectedFabric(fabric);
    },
    [trackView],
  );

  const filteredFabrics = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return fabrics.filter((fabric) => {
      if (!matchesCatalogFilter(fabric, activeFilter)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        fabric.name.en,
        fabric.name.ar,
        fabric.fabricType.en,
        fabric.fabricType.ar,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeFilter, fabrics, searchQuery]);

  const recentlyViewedFabrics = useMemo(
    () => fabrics.filter((fabric) => recentIds.includes(fabric.id)),
    [fabrics, recentIds],
  );

  const mostUsedFabrics = useMemo(
    () =>
      fabrics.filter((fabric) => content.featuredFabricIds.includes(fabric.id)),
    [content.featuredFabricIds, fabrics],
  );

  const favoriteFabrics = useMemo(
    () => fabrics.filter((fabric) => favorites.includes(fabric.id)),
    [fabrics, favorites],
  );

  const showSpotlightSections = !searchQuery.trim() && activeFilter === 'all';

  return (
    <section className="fabrics-catalog mx-auto">
      <header className="fabrics-catalog__header">
        <div className="fabrics-catalog__title-block">
          <span aria-hidden="true" className="fabrics-catalog__emoji">
            🧵
          </span>
          <h1 className="fabrics-catalog__title-en">Fabrics Library</h1>
          <h1 className="fabrics-catalog__title-ar">مكتبة الأقمشة</h1>
        </div>

        <label className="fabrics-catalog__search">
          <Search
            aria-hidden="true"
            className="fabrics-catalog__search-icon"
            strokeWidth={1.75}
          />
          <input
            className="fabrics-catalog__search-input"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('fabrics.catalog.searchPlaceholder')}
            type="search"
            value={searchQuery}
          />
        </label>

        <div
          aria-label={t('fabrics.filters.label')}
          className="fabrics-catalog__filters"
          role="group"
        >
          {catalogFilters.map((filter) => (
            <button
              className={`fabrics-catalog__filter${activeFilter === filter ? 'fabrics-catalog__filter--active' : ''}`}
              key={filter}
              onClick={() => setActiveFilter(filter)}
              type="button"
            >
              {t(filterLabelKeys[filter])}
            </button>
          ))}
        </div>
      </header>

      {favoriteFabrics.length > 0 && showSpotlightSections ? (
        <section
          aria-labelledby="fabrics-favorites-title"
          className="fabrics-catalog__section"
        >
          <div className="fabrics-catalog__section-head">
            <h2
              className="fabrics-catalog__section-title-en"
              id="fabrics-favorites-title"
            >
              {dictionaries.en['fabrics.catalog.sections.favorites']}
            </h2>
            <h2 className="fabrics-catalog__section-title-ar">
              {dictionaries.ar['fabrics.catalog.sections.favorites']}
            </h2>
          </div>
          <div className="fabrics-catalog__strip">
            {favoriteFabrics.map((fabric) => (
              <FabricCatalogCard
                compact
                fabric={fabric}
                isFavorite={isFavorite(fabric.id)}
                key={fabric.id}
                onSelect={handleSelectFabric}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </section>
      ) : null}

      {filteredFabrics.length > 0 ? (
        <div className="fabrics-catalog__grid">
          {filteredFabrics.map((fabric) => (
            <FabricCatalogCard
              fabric={fabric}
              isFavorite={isFavorite(fabric.id)}
              key={fabric.id}
              onSelect={handleSelectFabric}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="fabrics-catalog__empty">
          <p className="fabrics-catalog__empty-en">{t('fabrics.noResults')}</p>
          <p className="fabrics-catalog__empty-ar">
            {t('fabrics.catalog.noResultsAr')}
          </p>
        </div>
      )}

      {showSpotlightSections && recentlyViewedFabrics.length > 0 ? (
        <section
          aria-labelledby="fabrics-recent-title"
          className="fabrics-catalog__section"
        >
          <div className="fabrics-catalog__section-head">
            <h2
              className="fabrics-catalog__section-title-en"
              id="fabrics-recent-title"
            >
              {dictionaries.en['fabrics.catalog.sections.recentlyViewed']}
            </h2>
            <h2 className="fabrics-catalog__section-title-ar">
              {dictionaries.ar['fabrics.catalog.sections.recentlyViewed']}
            </h2>
          </div>
          <div className="fabrics-catalog__strip">
            {recentlyViewedFabrics.map((fabric) => (
              <FabricCatalogCard
                compact
                fabric={fabric}
                isFavorite={isFavorite(fabric.id)}
                key={fabric.id}
                onSelect={handleSelectFabric}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </section>
      ) : null}

      {showSpotlightSections ? (
        <section
          aria-labelledby="fabrics-most-used-title"
          className="fabrics-catalog__section"
        >
          <div className="fabrics-catalog__section-head">
            <h2
              className="fabrics-catalog__section-title-en"
              id="fabrics-most-used-title"
            >
              {dictionaries.en['fabrics.catalog.sections.mostUsedInHotel']}
            </h2>
            <h2 className="fabrics-catalog__section-title-ar">
              {dictionaries.ar['fabrics.catalog.sections.mostUsedInHotel']}
            </h2>
            <p className="fabrics-catalog__section-desc-en">
              {dictionaries.en['fabrics.catalog.sections.mostUsedDesc']}
            </p>
            <p className="fabrics-catalog__section-desc-ar">
              {dictionaries.ar['fabrics.catalog.sections.mostUsedDesc']}
            </p>
          </div>
          <div className="fabrics-catalog__strip">
            {mostUsedFabrics.map((fabric) => (
              <FabricCatalogCard
                compact
                fabric={fabric}
                isFavorite={isFavorite(fabric.id)}
                key={fabric.id}
                onSelect={handleSelectFabric}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </section>
      ) : null}

      <FabricDetailModal
        fabric={selectedFabric}
        isFavoriteFabric={isFavorite}
        onClose={() => setSelectedFabric(null)}
        onSelectFabric={handleSelectFabric}
        onToggleFavorite={toggleFavorite}
      />
    </section>
  );
}

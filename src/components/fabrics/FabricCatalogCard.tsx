import { Droplets, Hand, Shirt, Sparkles, Star, Wind } from 'lucide-react';
import type { LaundryFabric } from '@/data/laundry-fabrics';
import { FabricImage } from '@/components/fabrics/FabricImage';
import {
  extractWashTemperatureBadge,
  getCareSymbolKind,
  getCategoryBadge,
  type CareSymbolKind,
} from '@/components/fabrics/fabric-catalog-utils';
import type { FabricFilterCategory } from '@/data/laundry-fabrics';

type FabricCatalogCardProps = {
  fabric: LaundryFabric;
  isFavorite?: boolean;
  onSelect: (fabric: LaundryFabric) => void;
  onToggleFavorite?: (fabricId: string) => void;
  compact?: boolean;
};

const badgeLabels: Record<FabricFilterCategory, { en: string; ar: string }> = {
  natural: { en: 'Natural', ar: 'طبيعي' },
  synthetic: { en: 'Synthetic', ar: 'اصطناعي' },
  blended: { en: 'Blend', ar: 'مخلوط' },
  luxury: { en: 'Luxury', ar: 'فاخر' },
  hotelLinen: { en: 'Hotel Linen', ar: 'بياضات فندقية' },
  uniform: { en: 'Uniform', ar: 'زي رسمي' },
};

const careIcons: Record<CareSymbolKind, typeof Droplets> = {
  machine: Droplets,
  delicate: Wind,
  dryClean: Sparkles,
  handWash: Hand,
  wool: Shirt,
};

const careLabels: Record<CareSymbolKind, { en: string; ar: string }> = {
  machine: { en: 'Machine wash', ar: 'غسيل آلي' },
  delicate: { en: 'Delicate cycle', ar: 'دورة حساسة' },
  dryClean: { en: 'Dry clean', ar: 'تنظيف جاف' },
  handWash: { en: 'Hand wash', ar: 'غسيل يدوي' },
  wool: { en: 'Wool care', ar: 'عناية بالصوف' },
};

export function FabricCatalogCard({
  fabric,
  isFavorite = false,
  onSelect,
  onToggleFavorite,
  compact = false,
}: FabricCatalogCardProps) {
  const category = getCategoryBadge(fabric);
  const badge = badgeLabels[category];
  const tempBadge = extractWashTemperatureBadge(fabric);
  const careKind = getCareSymbolKind(fabric);
  const CareIcon = careIcons[careKind];
  const careLabel = careLabels[careKind];

  return (
    <div
      className={`fabric-catalog-card${compact ? ' fabric-catalog-card--compact' : ''}`}
      onClick={() => onSelect(fabric)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(fabric);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="fabric-catalog-card__image-wrap">
        <FabricImage alt="" compact={compact} src={fabric.image} />

        <span
          aria-label={`${careLabel.en} / ${careLabel.ar}`}
          className="fabric-catalog-card__care-badge"
          title={`${careLabel.en} / ${careLabel.ar}`}
        >
          <CareIcon aria-hidden="true" strokeWidth={2} />
        </span>

        {tempBadge ? (
          <span className="fabric-catalog-card__temp-badge">{tempBadge}</span>
        ) : null}

        {onToggleFavorite ? (
          <button
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={isFavorite}
            className={`fabric-catalog-card__favorite${isFavorite ? ' fabric-catalog-card__favorite--active' : ''}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(fabric.id);
            }}
            type="button"
          >
            <Star aria-hidden="true" fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={1.75} />
          </button>
        ) : null}
      </div>

      <div className="fabric-catalog-card__body">
        <p className="fabric-catalog-card__name-ar">{fabric.name.ar}</p>
        <p className="fabric-catalog-card__name-en">{fabric.name.en}</p>
        <span className="fabric-catalog-card__badge">
          <span className="fabric-catalog-card__badge-ar">{badge.ar}</span>
          <span className="fabric-catalog-card__badge-en">{badge.en}</span>
        </span>
      </div>
    </div>
  );
}

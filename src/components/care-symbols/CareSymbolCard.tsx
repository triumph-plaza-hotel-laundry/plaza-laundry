import { CareSymbolGraphicView } from '@/components/care-symbols/CareSymbolGraphic';
import { categoryLabels } from '@/components/care-symbols/care-catalog-utils';
import type { CareLabel } from '@/data/care-symbols';

type CareSymbolCardProps = {
  label: CareLabel;
  onSelect: (label: CareLabel) => void;
};

export function CareSymbolCard({ label, onSelect }: CareSymbolCardProps) {
  const category = categoryLabels[label.category];

  return (
    <div
      className="care-card"
      onClick={() => onSelect(label)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(label);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="care-card__symbol-wrap">
        <CareSymbolGraphicView
          className="care-card__symbol"
          graphic={label.graphic}
        />
      </div>

      <div className="care-card__body">
        <p className="care-card__name-ar">{label.name.ar}</p>
        <p className="care-card__name-en">{label.name.en}</p>
        <span className="care-card__badge">
          <span className="care-card__badge-ar">{category.ar}</span>
          <span className="care-card__badge-en">{category.en}</span>
        </span>
      </div>
    </div>
  );
}

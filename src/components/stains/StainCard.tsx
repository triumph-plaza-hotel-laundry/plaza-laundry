import type { LaundryStain } from '@/data/laundry-stains';
import { getStainIcon } from '@/components/stains/stain-icons';
import {
  categoryLabels,
  difficultyLabels,
} from '@/components/stains/stain-catalog-utils';

type StainCardProps = {
  stain: LaundryStain;
  onSelect: (stain: LaundryStain) => void;
};

export function StainCard({ stain, onSelect }: StainCardProps) {
  const Icon = getStainIcon(stain.icon);
  const difficulty = difficultyLabels[stain.difficulty];
  const category = categoryLabels[stain.category];

  return (
    <div
      className="stain-card"
      onClick={() => onSelect(stain)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(stain);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="stain-card__icon-wrap">
        <Icon aria-hidden="true" className="stain-card__icon" strokeWidth={1.5} />
      </div>

      <div className="stain-card__body">
        <p className="stain-card__name-ar">{stain.name.ar}</p>
        <p className="stain-card__name-en">{stain.name.en}</p>

        <div className="stain-card__badges">
          <span className={`stain-card__badge stain-card__badge--difficulty stain-card__badge--${stain.difficulty}`}>
            <span className="stain-card__badge-ar">{difficulty.ar}</span>
            <span className="stain-card__badge-en">{difficulty.en}</span>
          </span>
          <span className="stain-card__badge stain-card__badge--category">
            <span className="stain-card__badge-ar">{category.ar}</span>
            <span className="stain-card__badge-en">{category.en}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

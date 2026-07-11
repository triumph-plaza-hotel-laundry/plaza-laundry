import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  Droplets,
  Flame,
  Layers,
  Shirt,
  Sparkles,
  Star,
  Thermometer,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { useEffect } from 'react';
import { FabricCatalogCard } from '@/components/fabrics/FabricCatalogCard';
import { FabricImage } from '@/components/fabrics/FabricImage';
import {
  getRelatedFabrics,
  inferSpinSpeed,
  splitHotelUses,
} from '@/components/fabrics/fabric-catalog-utils';
import type { LaundryFabric, LocalizedText } from '@/data/laundry-fabrics';
import { dictionaries } from '@/i18n/dictionaries';

type FabricDetailModalProps = {
  fabric: LaundryFabric | null;
  isFavoriteFabric?: (fabricId: string) => boolean;
  onClose: () => void;
  onSelectFabric: (fabric: LaundryFabric) => void;
  onToggleFavorite?: (fabricId: string) => void;
};

type DetailRowProps = {
  icon: typeof Layers;
  labelEn: string;
  labelAr: string;
  value: LocalizedText | { en: string; ar: string };
};

function DetailRow({ icon: Icon, labelEn, labelAr, value }: DetailRowProps) {
  return (
    <div className="fabric-modal__detail">
      <div className="fabric-modal__detail-icon-wrap">
        <Icon
          aria-hidden="true"
          className="fabric-modal__detail-icon"
          strokeWidth={1.75}
        />
      </div>
      <div className="fabric-modal__detail-content">
        <p className="fabric-modal__detail-label-en">{labelEn}</p>
        <p className="fabric-modal__detail-label-ar">{labelAr}</p>
        <p className="fabric-modal__detail-value-en">{value.en}</p>
        <p className="fabric-modal__detail-value-ar">{value.ar}</p>
      </div>
    </div>
  );
}

export function FabricDetailModal({
  fabric,
  isFavoriteFabric,
  onClose,
  onSelectFabric,
  onToggleFavorite,
}: FabricDetailModalProps) {
  useEffect(() => {
    if (!fabric) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fabric, onClose]);

  const relatedFabrics = fabric ? getRelatedFabrics(fabric) : [];
  const hotelUses = fabric ? splitHotelUses(fabric) : { en: [], ar: [] };
  const spinSpeed = fabric ? inferSpinSpeed(fabric) : { en: '', ar: '' };
  const modalIsFavorite =
    fabric && isFavoriteFabric ? isFavoriteFabric(fabric.id) : false;

  const yes = {
    en: dictionaries.en['fabrics.yes'],
    ar: dictionaries.ar['fabrics.yes'],
  };
  const no = {
    en: dictionaries.en['fabrics.no'],
    ar: dictionaries.ar['fabrics.no'],
  };

  return (
    <AnimatePresence>
      {fabric ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fabric-modal__backdrop"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={onClose}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="fabric-modal"
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fabric-modal-title-en"
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <button
              className="fabric-modal__close"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" strokeWidth={1.75} />
              <span className="sr-only">
                {dictionaries.en['common.closeMenu']}
              </span>
            </button>

            <div className="fabric-modal__hero">
              <div className="fabric-modal__image-frame">
                <FabricImage
                  alt=""
                  className="fabric-modal__fabric-image"
                  src={fabric.image}
                />
              </div>
              <div className="fabric-modal__titles">
                <p className="fabric-modal__name-ar" id="fabric-modal-title-ar">
                  {fabric.name.ar}
                </p>
                <p className="fabric-modal__name-en" id="fabric-modal-title-en">
                  {fabric.name.en}
                </p>
                {onToggleFavorite ? (
                  <button
                    className={`fabric-modal__favorite${modalIsFavorite ? 'fabric-modal__favorite--active' : ''}`}
                    onClick={() => onToggleFavorite(fabric.id)}
                    type="button"
                  >
                    <Star
                      aria-hidden="true"
                      fill={modalIsFavorite ? 'currentColor' : 'none'}
                      strokeWidth={1.75}
                    />
                    <span className="fabric-modal__favorite-en">
                      {modalIsFavorite
                        ? 'Saved to favorites'
                        : 'Add to favorites'}
                    </span>
                    <span className="fabric-modal__favorite-ar">
                      {modalIsFavorite ? 'محفوظ في المفضلة' : 'أضف إلى المفضلة'}
                    </span>
                  </button>
                ) : null}
              </div>
            </div>

            <hr aria-hidden="true" className="fabric-modal__divider" />

            <div className="fabric-modal__details">
              <DetailRow
                icon={Layers}
                labelAr={dictionaries.ar['fabrics.fields.fabricType']}
                labelEn={dictionaries.en['fabrics.fields.fabricType']}
                value={fabric.fabricType}
              />
              <DetailRow
                icon={Sparkles}
                labelAr={
                  dictionaries.ar['fabrics.catalog.modal.recommendedProgram']
                }
                labelEn={
                  dictionaries.en['fabrics.catalog.modal.recommendedProgram']
                }
                value={fabric.washingProgram}
              />
              <DetailRow
                icon={Thermometer}
                labelAr={dictionaries.ar['fabrics.fields.washTemperature']}
                labelEn={dictionaries.en['fabrics.fields.washTemperature']}
                value={fabric.washTemperature}
              />
              <DetailRow
                icon={Zap}
                labelAr={dictionaries.ar['fabrics.catalog.modal.spinSpeed']}
                labelEn={dictionaries.en['fabrics.catalog.modal.spinSpeed']}
                value={spinSpeed}
              />
              <DetailRow
                icon={Wind}
                labelAr={dictionaries.ar['fabrics.fields.dryingMethod']}
                labelEn={dictionaries.en['fabrics.fields.dryingMethod']}
                value={fabric.dryingMethod}
              />
              <DetailRow
                icon={Flame}
                labelAr={dictionaries.ar['fabrics.fields.ironTemperature']}
                labelEn={dictionaries.en['fabrics.fields.ironTemperature']}
                value={fabric.ironTemperature}
              />
              <DetailRow
                icon={Droplets}
                labelAr={dictionaries.ar['fabrics.fields.bleachAllowed']}
                labelEn={dictionaries.en['fabrics.fields.bleachAllowed']}
                value={fabric.bleachAllowed ? yes : no}
              />
              <DetailRow
                icon={Shirt}
                labelAr={dictionaries.ar['fabrics.fields.dryCleaning']}
                labelEn={dictionaries.en['fabrics.fields.dryCleaning']}
                value={fabric.dryCleaning ? yes : no}
              />
              <DetailRow
                icon={Sparkles}
                labelAr={dictionaries.ar['fabrics.fields.specialCare']}
                labelEn={dictionaries.en['fabrics.fields.specialCare']}
                value={fabric.specialCare}
              />
            </div>

            <section className="fabric-modal__uses">
              <div className="fabric-modal__uses-header">
                <Building2
                  aria-hidden="true"
                  className="fabric-modal__uses-icon"
                  strokeWidth={1.75}
                />
                <div>
                  <p className="fabric-modal__uses-label-en">
                    {dictionaries.en['fabrics.fields.hotelUses']}
                  </p>
                  <p className="fabric-modal__uses-label-ar">
                    {dictionaries.ar['fabrics.fields.hotelUses']}
                  </p>
                </div>
              </div>
              <div className="fabric-modal__uses-chips">
                {hotelUses.en.map((use, index) => (
                  <span
                    className="fabric-modal__use-chip"
                    key={`${use}-${index}`}
                  >
                    <span className="fabric-modal__use-chip-ar">
                      {hotelUses.ar[index] ?? use}
                    </span>
                    <span className="fabric-modal__use-chip-en">{use}</span>
                  </span>
                ))}
              </div>
            </section>

            {relatedFabrics.length > 0 ? (
              <section className="fabric-modal__related">
                <h3 className="fabric-modal__related-title-en">
                  {dictionaries.en['fabrics.catalog.related']}
                </h3>
                <h3 className="fabric-modal__related-title-ar">
                  {dictionaries.ar['fabrics.catalog.related']}
                </h3>
                <div className="fabric-modal__related-grid">
                  {relatedFabrics.map((related) => (
                    <FabricCatalogCard
                      compact
                      fabric={related}
                      isFavorite={isFavoriteFabric?.(related.id) ?? false}
                      key={related.id}
                      onSelect={onSelectFabric}
                      onToggleFavorite={onToggleFavorite}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

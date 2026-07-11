import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Building2,
  Droplets,
  Layers,
  ListOrdered,
  Shirt,
  Sparkles,
  Thermometer,
  X,
} from 'lucide-react';
import { useEffect } from 'react';
import { splitRemovalSteps } from '@/components/stains/stain-catalog-utils';
import { getStainIcon } from '@/components/stains/stain-icons';
import type { LaundryStain, LocalizedText } from '@/data/laundry-stains';
import { dictionaries } from '@/i18n/dictionaries';

type StainDetailModalProps = {
  stain: LaundryStain | null;
  onClose: () => void;
};

type DetailRowProps = {
  icon: typeof Layers;
  labelEn: string;
  labelAr: string;
  value: LocalizedText;
};

function DetailRow({ icon: Icon, labelEn, labelAr, value }: DetailRowProps) {
  return (
    <div className="stain-modal__detail">
      <div className="stain-modal__detail-icon-wrap">
        <Icon
          aria-hidden="true"
          className="stain-modal__detail-icon"
          strokeWidth={1.75}
        />
      </div>
      <div className="stain-modal__detail-content">
        <p className="stain-modal__detail-label-en">{labelEn}</p>
        <p className="stain-modal__detail-label-ar">{labelAr}</p>
        <p className="stain-modal__detail-value-en">{value.en}</p>
        <p className="stain-modal__detail-value-ar">{value.ar}</p>
      </div>
    </div>
  );
}

export function StainDetailModal({ stain, onClose }: StainDetailModalProps) {
  useEffect(() => {
    if (!stain) {
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
  }, [stain, onClose]);

  const steps = stain ? splitRemovalSteps(stain) : { en: [], ar: [] };
  const HeroIcon = stain ? getStainIcon(stain.icon) : Layers;

  return (
    <AnimatePresence>
      {stain ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="stain-modal__backdrop"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={onClose}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="stain-modal"
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="stain-modal-title-en"
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <button
              className="stain-modal__close"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" strokeWidth={1.75} />
              <span className="sr-only">
                {dictionaries.en['common.closeMenu']}
              </span>
            </button>

            <div className="stain-modal__hero">
              <div className="stain-modal__icon-frame">
                <HeroIcon
                  aria-hidden="true"
                  className="stain-modal__hero-icon"
                  strokeWidth={1.35}
                />
              </div>
              <div className="stain-modal__titles">
                <p className="stain-modal__name-ar" id="stain-modal-title-ar">
                  {stain.name.ar}
                </p>
                <p className="stain-modal__name-en" id="stain-modal-title-en">
                  {stain.name.en}
                </p>
              </div>
            </div>

            <hr aria-hidden="true" className="stain-modal__divider" />

            <div className="stain-modal__details">
              <DetailRow
                icon={Layers}
                labelAr={dictionaries.ar['stains.modal.description']}
                labelEn={dictionaries.en['stains.modal.description']}
                value={stain.description}
              />
              <DetailRow
                icon={Sparkles}
                labelAr={dictionaries.ar['stains.modal.recommendedChemical']}
                labelEn={dictionaries.en['stains.modal.recommendedChemical']}
                value={stain.recommendedChemical}
              />
              <DetailRow
                icon={Shirt}
                labelAr={dictionaries.ar['stains.modal.recommendedProgram']}
                labelEn={dictionaries.en['stains.modal.recommendedProgram']}
                value={stain.recommendedProgram}
              />
              <DetailRow
                icon={Thermometer}
                labelAr={dictionaries.ar['stains.modal.washTemperature']}
                labelEn={dictionaries.en['stains.modal.washTemperature']}
                value={stain.washTemperature}
              />
              <DetailRow
                icon={Droplets}
                labelAr={dictionaries.ar['stains.modal.fabricCompatibility']}
                labelEn={dictionaries.en['stains.modal.fabricCompatibility']}
                value={stain.fabricCompatibility}
              />
            </div>

            <section className="stain-modal__steps">
              <div className="stain-modal__section-head">
                <ListOrdered
                  aria-hidden="true"
                  className="stain-modal__section-icon"
                  strokeWidth={1.75}
                />
                <div>
                  <p className="stain-modal__section-label-en">
                    {dictionaries.en['stains.modal.removalSteps']}
                  </p>
                  <p className="stain-modal__section-label-ar">
                    {dictionaries.ar['stains.modal.removalSteps']}
                  </p>
                </div>
              </div>
              <ol className="stain-modal__steps-list">
                {steps.en.map((step, index) => (
                  <li
                    className="stain-modal__step"
                    key={`${stain.id}-step-${index}`}
                  >
                    <span className="stain-modal__step-ar">
                      {steps.ar[index] ?? step}
                    </span>
                    <span className="stain-modal__step-en">{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="stain-modal__warnings">
              <div className="stain-modal__section-head">
                <AlertTriangle
                  aria-hidden="true"
                  className="stain-modal__section-icon"
                  strokeWidth={1.75}
                />
                <div>
                  <p className="stain-modal__section-label-en">
                    {dictionaries.en['stains.modal.warnings']}
                  </p>
                  <p className="stain-modal__section-label-ar">
                    {dictionaries.ar['stains.modal.warnings']}
                  </p>
                </div>
              </div>
              <p className="stain-modal__warning-text-en">
                {stain.warnings.en}
              </p>
              <p className="stain-modal__warning-text-ar">
                {stain.warnings.ar}
              </p>
            </section>

            <section className="stain-modal__hotel">
              <div className="stain-modal__section-head">
                <Building2
                  aria-hidden="true"
                  className="stain-modal__section-icon"
                  strokeWidth={1.75}
                />
                <div>
                  <p className="stain-modal__section-label-en">
                    {dictionaries.en['stains.modal.hotelRecommendations']}
                  </p>
                  <p className="stain-modal__section-label-ar">
                    {dictionaries.ar['stains.modal.hotelRecommendations']}
                  </p>
                </div>
              </div>
              <p className="stain-modal__hotel-text-en">
                {stain.hotelRecommendations.en}
              </p>
              <p className="stain-modal__hotel-text-ar">
                {stain.hotelRecommendations.ar}
              </p>
            </section>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

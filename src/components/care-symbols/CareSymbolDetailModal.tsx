import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Building2,
  Info,
  Layers,
  ListChecks,
  Shirt,
  X,
} from 'lucide-react';
import { useEffect } from 'react';
import { CareSymbolGraphicView } from '@/components/care-symbols/CareSymbolGraphic';
import type { CareLabel, LocalizedText } from '@/data/care-symbols';
import { dictionaries } from '@/i18n/dictionaries';

type CareSymbolDetailModalProps = {
  label: CareLabel | null;
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
    <div className="care-modal__detail">
      <div className="care-modal__detail-icon-wrap">
        <Icon
          aria-hidden="true"
          className="care-modal__detail-icon"
          strokeWidth={1.75}
        />
      </div>
      <div className="care-modal__detail-content">
        <p className="care-modal__detail-label-en">{labelEn}</p>
        <p className="care-modal__detail-label-ar">{labelAr}</p>
        <p className="care-modal__detail-value-en">{value.en}</p>
        <p className="care-modal__detail-value-ar">{value.ar}</p>
      </div>
    </div>
  );
}

export function CareSymbolDetailModal({
  label,
  onClose,
}: CareSymbolDetailModalProps) {
  useEffect(() => {
    if (!label) {
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
  }, [label, onClose]);

  return (
    <AnimatePresence>
      {label ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="care-modal__backdrop"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={onClose}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="care-modal"
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="care-modal-title-en"
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <button
              className="care-modal__close"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" strokeWidth={1.75} />
              <span className="sr-only">
                {dictionaries.en['common.closeMenu']}
              </span>
            </button>

            <div className="care-modal__hero">
              <div className="care-modal__symbol-frame">
                <CareSymbolGraphicView
                  className="care-modal__symbol"
                  graphic={label.graphic}
                />
              </div>
              <div className="care-modal__titles">
                <p className="care-modal__name-ar" id="care-modal-title-ar">
                  {label.name.ar}
                </p>
                <p className="care-modal__name-en" id="care-modal-title-en">
                  {label.name.en}
                </p>
              </div>
            </div>

            <hr aria-hidden="true" className="care-modal__divider" />

            <div className="care-modal__details">
              <DetailRow
                icon={Info}
                labelAr={dictionaries.ar['care.modal.meaning']}
                labelEn={dictionaries.en['care.modal.meaning']}
                value={label.meaning}
              />
              <DetailRow
                icon={ListChecks}
                labelAr={dictionaries.ar['care.modal.instructions']}
                labelEn={dictionaries.en['care.modal.instructions']}
                value={label.instructions}
              />
              <DetailRow
                icon={Shirt}
                labelAr={dictionaries.ar['care.modal.recommendedFabrics']}
                labelEn={dictionaries.en['care.modal.recommendedFabrics']}
                value={label.recommendedFabrics}
              />
              <DetailRow
                icon={AlertTriangle}
                labelAr={dictionaries.ar['care.modal.warnings']}
                labelEn={dictionaries.en['care.modal.warnings']}
                value={label.warnings}
              />
              <DetailRow
                icon={Building2}
                labelAr={dictionaries.ar['care.modal.hotelNotes']}
                labelEn={dictionaries.en['care.modal.hotelNotes']}
                value={label.hotelNotes}
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

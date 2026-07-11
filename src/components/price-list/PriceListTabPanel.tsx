import { Building2, Store } from 'lucide-react';
import { PriceListSection } from '@/components/price-list/PriceListSection';
import {
  priceListCategories,
  priceListRepository,
  type PriceListItem,
  type PriceListTab,
} from '@/data/repositories';
import { useSyncStore } from '@/hooks/useSyncStore';
import type { usePriceListStorage } from '@/hooks/usePriceListStorage';
import { dictionaries } from '@/i18n/dictionaries';

type PriceListTabPanelProps = {
  tab: PriceListTab;
  prices: ReturnType<typeof usePriceListStorage>['prices'];
  onPriceChange: ReturnType<typeof usePriceListStorage>['updatePrice'];
  readOnly?: boolean;
};

export function PriceListTabPanel({
  tab,
  prices,
  onPriceChange,
  readOnly = false,
}: PriceListTabPanelProps) {
  const { items } = useSyncStore(priceListRepository);
  const tabPrices = prices[tab];
  const isGuest = tab === 'guest';
  const HeroIcon = isGuest ? Building2 : Store;

  return (
    <div className={`price-tab-panel price-tab-panel--${tab}`}>
      <header className={`price-tab-hero price-tab-hero--${tab}`}>
        <div className="price-tab-hero__icon-wrap">
          <HeroIcon
            aria-hidden="true"
            className="price-tab-hero__icon"
            strokeWidth={1.5}
          />
        </div>
        <div className="price-tab-hero__content">
          <span className="price-tab-hero__badge">
            <span className="price-tab-hero__badge-ar">
              {
                dictionaries.ar[
                  isGuest
                    ? 'priceList.badges.guest'
                    : 'priceList.badges.outsideGuest'
                ]
              }
            </span>
            <span className="price-tab-hero__badge-en">
              {
                dictionaries.en[
                  isGuest
                    ? 'priceList.badges.guest'
                    : 'priceList.badges.outsideGuest'
                ]
              }
            </span>
          </span>
          <p className="price-tab-hero__desc-ar">
            {isGuest
              ? 'خدمة غسيل فاخرة لضيوف تريومف بلازا المقيمين في الفندق.'
              : 'أسعار مميزة لخدمات الغسيل للزوار والعملاء الخارجيين.'}
          </p>
          <p className="price-tab-hero__desc-en">
            {isGuest
              ? 'Premium laundry service for in-house Triumph Plaza Hotel guests.'
              : 'Distinct pricing for walk-in visitors and external clientele.'}
          </p>
        </div>
      </header>

      {priceListCategories.map((category) => (
        <PriceListSection
          category={category}
          items={items.filter(
            (item: PriceListItem) => item.category === category,
          )}
          key={category}
          onPriceChange={(itemId, field, value) =>
            onPriceChange(tab, itemId, field, value)
          }
          prices={tabPrices}
          readOnly={readOnly}
          variant={tab}
        />
      ))}

      <aside className={`price-notice price-notice--${tab}`} role="note">
        <p className="price-notice__label-ar">
          {dictionaries.ar['priceList.note.label']}
        </p>
        <p className="price-notice__text-ar">
          {dictionaries.ar['priceList.note.body']}
        </p>
        <p className="price-notice__label-en">
          {dictionaries.en['priceList.note.label']}
        </p>
        <p className="price-notice__text-en">
          {dictionaries.en['priceList.note.body']}
        </p>
      </aside>
    </div>
  );
}

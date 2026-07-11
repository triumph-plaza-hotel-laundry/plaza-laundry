import type {
  ItemPrices,
  PriceField,
  PriceListCategory,
  PriceListItem,
  PriceListTab,
} from '@/data/laundry-price-list';
import { dictionaries } from '@/i18n/dictionaries';
import { useLanguage } from '@/hooks';
import type { TranslationKey } from '@/types/language';

type PriceListSectionProps = {
  category: PriceListCategory;
  items: PriceListItem[];
  prices: Record<string, ItemPrices>;
  onPriceChange: (itemId: string, field: PriceField, value: string) => void;
  variant: PriceListTab;
  readOnly?: boolean;
};

const sectionTitleKeys: Record<PriceListCategory, TranslationKey> = {
  mens: 'priceList.sections.mens',
  womens: 'priceList.sections.womens',
  bedding: 'priceList.sections.bedding',
};

const columnKeys: Record<'item' | PriceField, TranslationKey> = {
  item: 'priceList.columns.item',
  wash: 'priceList.columns.wash',
  dryClean: 'priceList.columns.dryClean',
  iron: 'priceList.columns.iron',
};

export function PriceListSection({
  category,
  items,
  prices,
  onPriceChange,
  variant,
  readOnly = false,
}: PriceListSectionProps) {
  const { language, t } = useLanguage();
  const labels = {
    item: t(columnKeys.item),
    wash: t(columnKeys.wash),
    dryClean: t(columnKeys.dryClean),
    iron: t(columnKeys.iron),
  };

  return (
    <section className={`price-section price-section--${variant}`}>
      <header className="price-section__header">
        <h2 className="price-section__title-en">
          {dictionaries.en[sectionTitleKeys[category]]}
        </h2>
        <h2 className="price-section__title-ar">
          {dictionaries.ar[sectionTitleKeys[category]]}
        </h2>
      </header>

      <div className="price-section__table-wrap">
        <table className="price-section__table luxury-table luxury-table--cards">
          <thead>
            <tr>
              <th scope="col">{labels.item}</th>
              <th scope="col">{labels.wash}</th>
              <th scope="col">{labels.dryClean}</th>
              <th scope="col">{labels.iron}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => {
              const rowPrices = prices[entry.id] ?? {
                wash: '',
                dryClean: '',
                iron: '',
              };

              return (
                <tr key={entry.id}>
                  <th
                    className="price-section__item-name"
                    data-label={labels.item}
                    scope="row"
                  >
                    <div className="price-section__item-lines">
                      <span className="price-section__item-line price-section__item-line--ar">
                        {entry.name.ar}
                      </span>
                      <span className="price-section__item-line price-section__item-line--en">
                        {entry.name.en}
                      </span>
                    </div>
                  </th>
                  {(['wash', 'dryClean', 'iron'] as const).map((field) => (
                    <td data-label={labels[field]} key={field}>
                      <input
                        aria-label={`${entry.name[language]} ${t(columnKeys[field])}`}
                        className="price-section__input"
                        inputMode="decimal"
                        onChange={(event) => {
                          if (!readOnly) {
                            onPriceChange(entry.id, field, event.target.value);
                          }
                        }}
                        placeholder="—"
                        readOnly={readOnly}
                        type="text"
                        value={rowPrices[field]}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

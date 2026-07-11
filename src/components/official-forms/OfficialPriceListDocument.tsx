import {
  priceListCategories,
  type ItemPrices,
  type PriceField,
  type PriceListCategory,
  type PriceListItem,
  type PriceListTab,
} from '@/data/laundry-price-list';
import { dictionaries } from '@/i18n/dictionaries';
import type { TranslationKey } from '@/types/language';
import { OfficialFormHeader } from '@/components/official-forms/OfficialFormHeader';

type OfficialPriceListDocumentProps = {
  tab: PriceListTab;
  items: readonly PriceListItem[];
  prices: Record<string, ItemPrices>;
  readOnly?: boolean;
  onPriceChange?: (itemId: string, field: PriceField, value: string) => void;
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

const tabBadge = {
  guest: {
    en: dictionaries.en['priceList.badges.guest'],
    ar: dictionaries.ar['priceList.badges.guest'],
  },
  outsideGuest: {
    en: dictionaries.en['priceList.badges.outsideGuest'],
    ar: dictionaries.ar['priceList.badges.outsideGuest'],
  },
} as const;

export function OfficialPriceListDocument({
  tab,
  items,
  prices,
  readOnly = false,
  onPriceChange,
}: OfficialPriceListDocumentProps) {
  return (
    <article
      aria-label="Laundry price list form"
      className="tpl-official-sheet"
    >
      <OfficialFormHeader
        badgeAr={tabBadge[tab].ar}
        badgeEn={tabBadge[tab].en}
        subtitleAr="مغسلة فندق تريومف بلازا — خدمات الضيوف"
        subtitleEn="Triumph Plaza Hotel Laundry — Guest Services"
        titleAr="قائمة الأسعار"
        titleEn="Price List"
      />

      <div className="tpl-official-sheet__body">
        {priceListCategories.map((category) => {
          const categoryItems = items.filter(
            (entry) => entry.category === category,
          );

          return (
            <section className="tpl-official-sheet__section" key={category}>
              <header className="tpl-official-sheet__section-head">
                <h2 className="tpl-official-sheet__section-title-en">
                  {dictionaries.en[sectionTitleKeys[category]]}
                </h2>
                <h2 className="tpl-official-sheet__section-title-ar">
                  {dictionaries.ar[sectionTitleKeys[category]]}
                </h2>
              </header>

              <div className="tpl-official-sheet__table-scroll">
                <table className="tpl-official-table">
                  <thead>
                    <tr>
                      <th className="tpl-official-table__item" scope="col">
                        <span className="tpl-official-table__head-en">
                          {dictionaries.en[columnKeys.item]}
                        </span>
                        <span className="tpl-official-table__head-ar">
                          {dictionaries.ar[columnKeys.item]}
                        </span>
                      </th>
                      {(['wash', 'dryClean', 'iron'] as const).map((field) => (
                        <th
                          className="tpl-official-table__price-col"
                          key={field}
                          scope="col"
                        >
                          <span className="tpl-official-table__head-en">
                            {dictionaries.en[columnKeys[field]]}
                          </span>
                          <span className="tpl-official-table__head-ar">
                            {dictionaries.ar[columnKeys[field]]}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {categoryItems.map((entry) => {
                      const rowPrices = prices[entry.id] ?? {
                        wash: '',
                        dryClean: '',
                        iron: '',
                      };

                      return (
                        <tr key={entry.id}>
                          <th className="tpl-official-table__item" scope="row">
                            <span className="tpl-official-table__item-ar">
                              {entry.name.ar}
                            </span>
                            <span className="tpl-official-table__item-en">
                              {entry.name.en}
                            </span>
                          </th>
                          {(['wash', 'dryClean', 'iron'] as const).map(
                            (field) => (
                              <td key={field}>
                                {readOnly ? (
                                  <span className="tpl-official-table__input tpl-official-table__input--static">
                                    {rowPrices[field] || '—'}
                                  </span>
                                ) : (
                                  <input
                                    aria-label={`${entry.name.en} ${dictionaries.en[columnKeys[field]]}`}
                                    className="tpl-official-table__input"
                                    inputMode="decimal"
                                    onChange={(event) =>
                                      onPriceChange?.(
                                        entry.id,
                                        field,
                                        event.target.value,
                                      )
                                    }
                                    type="text"
                                    value={rowPrices[field]}
                                  />
                                )}
                              </td>
                            ),
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}

        <aside className="tpl-official-sheet__note" role="note">
          <p className="tpl-official-sheet__note-label-ar">
            {dictionaries.ar['priceList.note.label']}
          </p>
          <p className="tpl-official-sheet__note-text-ar">
            {dictionaries.ar['priceList.note.body']}
          </p>
          <p className="tpl-official-sheet__note-label-en">
            {dictionaries.en['priceList.note.label']}
          </p>
          <p className="tpl-official-sheet__note-text-en">
            {dictionaries.en['priceList.note.body']}
          </p>
        </aside>

        <footer className="tpl-official-sheet__footer">
          <div className="tpl-official-sheet__signature">
            <p className="tpl-official-sheet__signature-label-ar">
              توقيع المدير
            </p>
            <p className="tpl-official-sheet__signature-label-en">
              Manager Signature
            </p>
            <div
              aria-hidden="true"
              className="tpl-official-sheet__signature-line"
            />
          </div>
          <div className="tpl-official-sheet__signature">
            <p className="tpl-official-sheet__signature-label-ar">
              توقيع المشرف
            </p>
            <p className="tpl-official-sheet__signature-label-en">
              Supervisor Signature
            </p>
            <div
              aria-hidden="true"
              className="tpl-official-sheet__signature-line"
            />
          </div>
          <div className="tpl-official-sheet__signature">
            <p className="tpl-official-sheet__signature-label-ar">التاريخ</p>
            <p className="tpl-official-sheet__signature-label-en">Date</p>
            <div
              aria-hidden="true"
              className="tpl-official-sheet__signature-line"
            />
          </div>
        </footer>
      </div>
    </article>
  );
}

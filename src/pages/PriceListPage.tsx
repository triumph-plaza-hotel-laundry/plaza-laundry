import { useState } from 'react';
import { OfficialFormActions } from '@/components/official-forms/OfficialFormActions';
import { OfficialPriceListDocument } from '@/components/official-forms/OfficialPriceListDocument';
import { type PriceListTab } from '@/data/repositories';
import { useLanguage, usePriceListStorage } from '@/hooks';
import type { TranslationKey } from '@/types/language';
import '@/components/official-forms/official-form.css';

const tabLabelKeys: Record<PriceListTab, TranslationKey> = {
  guest: 'priceList.tabs.guest',
  outsideGuest: 'priceList.tabs.outsideGuest',
};

export function PriceListPage() {
  const { t } = useLanguage();
  const { items, prices } = usePriceListStorage();
  const [activeTab, setActiveTab] = useState<PriceListTab>('guest');

  const printForm = () => {
    window.print();
  };

  return (
    <section className="tpl-form-page">
      <OfficialFormActions
        onPrint={printForm}
        printLabelAr="طباعة قائمة الأسعار"
        printLabelEn="Print Price List"
        showSync={false}
      />

      <div
        aria-label={t('priceList.tabs.label')}
        className="tpl-form-page__tabs"
        role="tablist"
      >
        {(Object.keys(tabLabelKeys) as PriceListTab[]).map((tab) => (
          <button
            aria-selected={activeTab === tab}
            className={`tpl-form-page__tab${activeTab === tab ? 'tpl-form-page__tab--active' : ''}`}
            key={tab}
            onClick={() => setActiveTab(tab)}
            role="tab"
            type="button"
          >
            {t(tabLabelKeys[tab])}
          </button>
        ))}
      </div>

      <div className="tpl-form-page__sheet-wrap" role="tabpanel">
        <OfficialPriceListDocument
          items={items}
          prices={prices[activeTab]}
          readOnly
          tab={activeTab}
        />
      </div>
    </section>
  );
}

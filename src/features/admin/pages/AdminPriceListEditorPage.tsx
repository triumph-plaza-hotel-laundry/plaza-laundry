import { useState } from 'react';
import { Building2, Store } from 'lucide-react';
import { PriceListTabPanel } from '@/components/price-list/PriceListTabPanel';
import { AdminEditToolbar } from '@/features/admin/components/AdminEditToolbar';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { useDraftState } from '@/features/admin/hooks/useDraftState';
import { priceListRepository, type PriceField, type PriceListTab } from '@/data/repositories';
import { useAuth, useLanguage } from '@/hooks';
import type { TranslationKey } from '@/types/language';
import '@/features/admin/admin-editor.css';
import '@/components/price-list/price-list-page.css';

const tabLabelKeys: Record<PriceListTab, TranslationKey> = {
  guest: 'priceList.tabs.guest',
  outsideGuest: 'priceList.tabs.outsideGuest',
};

const tabIcons: Record<PriceListTab, typeof Building2> = {
  guest: Building2,
  outsideGuest: Store,
};

export function AdminPriceListEditorPage() {
  const { t } = useLanguage();
  const { assertCan, logAction } = useAuth();
  const { draft, isDirty, setField, resetDraft, commitDraft } = useDraftState(priceListRepository);
  const [activeTab, setActiveTab] = useState<PriceListTab>('guest');
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveNoticeIsError, setSaveNoticeIsError] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveNotice(null);
    setSaveNoticeIsError(false);
    try {
      assertCan('priceList', 'update');
      await commitDraft(async (value) => {
        await priceListRepository.replaceAll(value);
        logAction({ action: 'priceList.replaceAll', page: 'admin/price-list', newValue: value });
      });
      setSaveNotice(t('admin.editor.saveSuccess'));
    } catch (error) {
      setSaveNotice(error instanceof Error ? error.message : t('admin.editor.saveError'));
      setSaveNoticeIsError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePriceChange = (tab: PriceListTab, itemId: string, field: PriceField, value: string) => {
    setField((current) => {
      const row = current.prices[tab][itemId] ?? { wash: '', dryClean: '', iron: '' };
      return {
        ...current,
        prices: {
          ...current.prices,
          [tab]: {
            ...current.prices[tab],
            [itemId]: { ...row, [field]: value },
          },
        },
      };
    });
  };

  return (
    <section className="price-list-page admin-editor-page mx-auto">
      <AdminPageHeader
        subtitle={t('admin.editor.priceListSubtitle')}
        titleAr="إدارة قائمة الأسعار"
        titleEn="Manage Price List"
      />
      <AdminEditToolbar
        isDirty={isDirty}
        isSaving={isSaving}
        notice={saveNotice}
        noticeIsError={saveNoticeIsError}
        onCancel={resetDraft}
        onSave={() => void handleSave()}
      />

      <div aria-label={t('priceList.tabs.label')} className="price-list-page__tabs" role="tablist">
        {(Object.keys(tabLabelKeys) as PriceListTab[]).map((tab) => {
          const TabIcon = tabIcons[tab];
          return (
            <button
              aria-selected={activeTab === tab}
              className={`price-list-page__tab price-list-page__tab--${tab}${activeTab === tab ? ' price-list-page__tab--active' : ''}`}
              key={tab}
              onClick={() => setActiveTab(tab)}
              role="tab"
              type="button"
            >
              <TabIcon aria-hidden="true" className="price-list-page__tab-icon" strokeWidth={1.75} />
              {t(tabLabelKeys[tab])}
            </button>
          );
        })}
      </div>

      <PriceListTabPanel
        onPriceChange={handlePriceChange}
        prices={draft.prices}
        readOnly={false}
        tab={activeTab}
      />
    </section>
  );
}

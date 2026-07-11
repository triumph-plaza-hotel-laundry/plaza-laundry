import { lazy, Suspense, useState } from 'react';

import { InventoryManagementPage } from '@/features/inventory/components/InventoryManagementPage';

const AdminInventoryPlanPage = lazy(() =>
  import('@/features/admin/pages/AdminInventoryPlanPage').then((module) => ({
    default: module.AdminInventoryPlanPage,
  })),
);

import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';

import {
  InventoryArchiveBanner,
  InventoryHistoryButton,
  InventoryHistoryDrawer,
} from '@/features/admin/components/InventoryHistoryDrawer';

import { InventoryArchiveProvider } from '@/features/admin/context/InventoryArchiveContext';

import { useInventoryArchive } from '@/features/admin/context/useInventoryArchive';

import { useLanguage } from '@/hooks';

import '@/features/admin/admin-editor.css';

import '@/features/inventory/inventory-management.css';

type AdminInventoryTab = 'inventory' | 'plan';

function AdminInventoryEditorContent() {
  const { t } = useLanguage();

  const archive = useInventoryArchive();

  const [activeTab, setActiveTab] = useState<AdminInventoryTab>('inventory');

  const archiveInventorySnapshot = archive.viewingArchive
    ? {
        items: archive.viewingArchive.inventoryData.items,

        transactions: archive.viewingArchive.inventoryData.transactions,

        cachedAt: Date.now(),

        itemsScope: 'managed' as const,
      }
    : null;

  return (
    <section className="admin-editor-page admin-editor-page--inventory mx-auto">
      <InventoryHistoryButton />

      <InventoryHistoryDrawer />

      <InventoryArchiveBanner />

      <nav
        aria-label={t('inventory.tabs.label')}
        className="inv-page-shell__tabs"
        role="tablist"
      >
        <button
          aria-controls="admin-inv-panel-inventory"
          aria-selected={activeTab === 'inventory'}
          className={`inv-page-shell__tab${activeTab === 'inventory' ? 'inv-page-shell__tab--active' : ''}`}
          id="admin-inv-tab-inventory"
          onClick={() => setActiveTab('inventory')}
          role="tab"
          type="button"
        >
          {t('inventory.tabs.inventory')}
        </button>

        <button
          aria-controls="admin-inv-panel-plan"
          aria-selected={activeTab === 'plan'}
          className={`inv-page-shell__tab${activeTab === 'plan' ? 'inv-page-shell__tab--active' : ''}`}
          id="admin-inv-tab-plan"
          onClick={() => setActiveTab('plan')}
          role="tab"
          type="button"
        >
          {t('inventory.tabs.plan')}
        </button>
      </nav>

      <div
        aria-labelledby="admin-inv-tab-inventory"
        hidden={activeTab !== 'inventory'}
        id="admin-inv-panel-inventory"
        role="tabpanel"
      >
        <AdminPageHeader
          subtitle={t('admin.editor.inventorySubtitle')}
          titleAr="إدارة المخزون"
          titleEn="Manage Inventory"
        />

        <InventoryManagementPage
          editableQuantities={!archive.isArchiveView}
          managedItems={!archive.isArchiveView}
          readOnly={archive.isArchiveView}
          showAddItem={!archive.isArchiveView}
          showHeader={false}
          snapshotOverride={archiveInventorySnapshot}
        />
      </div>

      <div
        aria-labelledby="admin-inv-tab-plan"
        hidden={activeTab !== 'plan'}
        id="admin-inv-panel-plan"
        role="tabpanel"
      >
        {activeTab === 'plan' ? (
          <Suspense
            fallback={
              <p className="admin-inventory-plan__loading">
                {t('inventory.plan.loading')}
              </p>
            }
          >
            <AdminInventoryPlanPage />
          </Suspense>
        ) : null}
      </div>
    </section>
  );
}

export function AdminInventoryEditorPage() {
  return (
    <InventoryArchiveProvider>
      <AdminInventoryEditorContent />
    </InventoryArchiveProvider>
  );
}

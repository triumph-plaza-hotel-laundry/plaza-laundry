import { lazy, Suspense, useState } from 'react';

import { InventoryManagementPage } from '@/features/inventory/components/InventoryManagementPage';
import { TransactionHistoryTable } from '@/features/inventory/components/TransactionHistoryTable';

const AdminInventoryPlanPage = lazy(() =>
  import('@/features/admin/pages/AdminInventoryPlanPage').then((module) => ({
    default: module.AdminInventoryPlanPage,
  })),
);

const AdminUnderExecutionPage = lazy(() =>
  import('@/features/admin/pages/AdminUnderExecutionPage').then((module) => ({
    default: module.AdminUnderExecutionPage,
  })),
);

import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { ArchiveHistoryViewShell } from '@/features/admin/components/ArchiveHistoryViewShell';

import {
  InventoryHistoryButton,
  InventoryHistoryDrawer,
} from '@/features/admin/components/InventoryHistoryDrawer';

import { InventoryArchiveProvider } from '@/features/admin/context/InventoryArchiveContext';

import { useInventoryArchive } from '@/features/admin/context/useInventoryArchive';

import { useLanguage } from '@/hooks';

import '@/features/admin/admin-editor.css';

import '@/features/inventory/inventory-management.css';

type AdminInventoryTab = 'inventory' | 'plan' | 'underExecution';

function AdminInventoryLivePanel() {
  const { t } = useLanguage();
  const {
    currentMonth,
    ensureArchiveSynced,
    isArchiveView,
    liveDataRevision,
    planDocument,
    viewingArchive,
  } = useInventoryArchive();

  const liveMonthKey =
    planDocument?.workingMonth || currentMonth || null;

  return (
    <>
      <div hidden={isArchiveView}>
        <AdminPageHeader
          subtitle={t('admin.editor.inventorySubtitle')}
          titleAr="إدارة المخزون"
          titleEn="Manage Inventory"
        />

        <InventoryManagementPage
          editableQuantities
          historyMonthKey={liveMonthKey}
          liveDataRevision={liveDataRevision}
          managedItems
          onBeforeWrite={ensureArchiveSynced}
          readOnly={false}
          showAddItem
          showHeader={false}
        />
      </div>

      {isArchiveView ? (
        <ArchiveHistoryViewShell
          titleAr={t('inventory.v2.historyTitleAr')}
          titleEn={t('inventory.v2.historyTitle')}
        >
          <TransactionHistoryTable
            transactions={viewingArchive?.inventoryData.transactions ?? []}
          />
        </ArchiveHistoryViewShell>
      ) : null}
    </>
  );
}

function AdminInventoryEditorContent() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<AdminInventoryTab>('inventory');

  return (
    <section className="admin-editor-page admin-editor-page--inventory mx-auto">
      <InventoryHistoryButton />

      <InventoryHistoryDrawer />

      <nav
        aria-label={t('inventory.tabs.label')}
        className="inv-page-shell__tabs"
        role="tablist"
      >
        <button
          aria-controls="admin-inv-panel-inventory"
          aria-selected={activeTab === 'inventory'}
          className={`inv-page-shell__tab${activeTab === 'inventory' ? ' inv-page-shell__tab--active' : ''}`}
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
          className={`inv-page-shell__tab${activeTab === 'plan' ? ' inv-page-shell__tab--active' : ''}`}
          id="admin-inv-tab-plan"
          onClick={() => setActiveTab('plan')}
          role="tab"
          type="button"
        >
          {t('inventory.tabs.plan')}
        </button>

        <button
          aria-controls="admin-inv-panel-under-execution"
          aria-selected={activeTab === 'underExecution'}
          className={`inv-page-shell__tab${activeTab === 'underExecution' ? ' inv-page-shell__tab--active' : ''}`}
          id="admin-inv-tab-under-execution"
          onClick={() => setActiveTab('underExecution')}
          role="tab"
          type="button"
        >
          {t('inventory.tabs.underExecution')}
        </button>
      </nav>

      <div
        aria-labelledby="admin-inv-tab-inventory"
        hidden={activeTab !== 'inventory'}
        id="admin-inv-panel-inventory"
        role="tabpanel"
      >
        <AdminInventoryLivePanel />
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

      <div
        aria-labelledby="admin-inv-tab-under-execution"
        hidden={activeTab !== 'underExecution'}
        id="admin-inv-panel-under-execution"
        role="tabpanel"
      >
        {activeTab === 'underExecution' ? (
          <Suspense
            fallback={
              <p className="admin-inventory-plan__loading">
                {t('inventory.underExecution.loading')}
              </p>
            }
          >
            <AdminUnderExecutionPage />
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

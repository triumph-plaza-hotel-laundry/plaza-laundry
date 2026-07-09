import { useState } from 'react';

import { InventoryLoginPage } from '@/features/inventory/components/InventoryLoginPage';

import { InventoryManagementPage } from '@/features/inventory/components/InventoryManagementPage';

import { PublicInventoryPlanPage } from '@/features/inventory/components/PublicInventoryPlanPage';

import { useInventoryAuth, useLanguage } from '@/hooks';

import '@/features/inventory/inventory-management.css';



type InventoryPageTab = 'inventory' | 'plan';



export function ReportsPage() {

  const { t } = useLanguage();

  const { isAuthenticated, login, logout } = useInventoryAuth();

  const [activeTab, setActiveTab] = useState<InventoryPageTab>('inventory');



  if (!isAuthenticated) {

    return <InventoryLoginPage onLogin={login} />;

  }



  return (

    <div className="inv-page-shell mx-auto">

      <div className="inv-page-shell__toolbar">

        <button className="inv-page-shell__logout" onClick={logout} type="button">

          {t('inventory.login.logout')}

        </button>

      </div>



      <nav aria-label={t('inventory.tabs.label')} className="inv-page-shell__tabs" role="tablist">

        <button

          aria-selected={activeTab === 'inventory'}

          className={`inv-page-shell__tab${activeTab === 'inventory' ? ' inv-page-shell__tab--active' : ''}`}

          id="inv-tab-inventory"

          onClick={() => setActiveTab('inventory')}

          role="tab"

          type="button"

        >

          {t('inventory.tabs.inventory')}

        </button>

        <button

          aria-selected={activeTab === 'plan'}

          className={`inv-page-shell__tab${activeTab === 'plan' ? ' inv-page-shell__tab--active' : ''}`}

          id="inv-tab-plan"

          onClick={() => setActiveTab('plan')}

          role="tab"

          type="button"

        >

          {t('inventory.tabs.plan')}

        </button>

      </nav>



      <div

        aria-labelledby="inv-tab-inventory"

        hidden={activeTab !== 'inventory'}

        role="tabpanel"

      >

        <InventoryManagementPage />

      </div>



      <div

        aria-labelledby="inv-tab-plan"

        hidden={activeTab !== 'plan'}

        role="tabpanel"

      >

        <PublicInventoryPlanPage />

      </div>

    </div>

  );

}



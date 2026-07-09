import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { dictionaries } from '@/i18n/dictionaries';
import {
  PLAN_DEPARTMENTS,
  PLAN_DEPARTMENT_LABEL_KEYS,
  ITEM_LABEL_KEYS,
  PLAN_ITEM_BLANK_OPTION_LABEL,
  buildDepartmentRows,
  formatPlanQuantity,
  formatPlanReceivingDate,
  type PlanDepartmentId,
} from '@/features/inventory/inventory-plan-schema';
import type { PlanRowDraft, PlanRowDrafts } from '@/features/inventory/monthly-archive-types';
import { usePublicInventoryPlan } from '@/hooks/usePublicInventoryPlan';
import { useLanguage } from '@/hooks';
import type { TranslationKey } from '@/types/language';
import '@/features/admin/admin-editor.css';

function PublicPlanAccordionSection({
  children,
  titleAr,
  titleEn,
}: {
  children: ReactNode;
  titleAr: string;
  titleEn: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`org-accordion__section${isOpen ? ' org-accordion__section--open' : ''}`}>
      <button
        aria-expanded={isOpen}
        className="org-accordion__trigger"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <ChevronDown aria-hidden="true" className="org-accordion__chevron" strokeWidth={1.75} />
        <span className="org-accordion__trigger-text">
          <span className="org-accordion__trigger-ar">{titleAr}</span>
          <span className="org-accordion__trigger-en">{titleEn}</span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            animate={{ height: 'auto', opacity: 1 }}
            className="org-accordion__panel"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
          >
            <div className="org-accordion__panel-inner">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function PublicPlanDepartmentTable({
  departmentId,
  rowDrafts,
  t,
}: {
  departmentId: PlanDepartmentId;
  rowDrafts: PlanRowDrafts;
  t: (key: TranslationKey) => string;
}) {
  const rows = buildDepartmentRows(departmentId);

  return (
    <div className="admin-inventory-plan__table-wrap">
      <table className="admin-inventory-plan__table admin-inventory-plan__table--readonly" dir="rtl">
        <colgroup>
          <col className="admin-inventory-plan__col--category" />
          <col className="admin-inventory-plan__col--variant" />
          <col className="admin-inventory-plan__col--date" />
          <col className="admin-inventory-plan__col--quantity" />
        </colgroup>
        <thead>
          <tr>
            <th className="admin-inventory-plan__th" scope="col">
              {t('admin.inventory.plan.table.category')}
            </th>
            <th className="admin-inventory-plan__th" scope="col">
              {t('inventory.plan.table.selectedUniform')}
            </th>
            <th className="admin-inventory-plan__th" scope="col">
              {t('admin.inventory.plan.table.lastReceiptDate')}
            </th>
            <th className="admin-inventory-plan__th" scope="col">
              {t('admin.inventory.plan.table.quantityPerEmployee')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const draft = (rowDrafts[row.id] ?? {
              day: '',
              month: '',
              year: '',
              quantity: '',
              itemVariant: '',
            }) as PlanRowDraft;
            const variantKey = draft.itemVariant.trim();

            return (
              <tr className="admin-inventory-plan__row" key={row.id}>
                <td className="admin-inventory-plan__td admin-inventory-plan__td--category">
                  <span className="admin-inventory-plan__readonly-text">
                    {t(ITEM_LABEL_KEYS[row.itemKey])}
                  </span>
                </td>
                <td className="admin-inventory-plan__td admin-inventory-plan__td--variant">
                  <span className="admin-inventory-plan__readonly-text">
                    {variantKey ? t(variantKey as TranslationKey) : PLAN_ITEM_BLANK_OPTION_LABEL}
                  </span>
                </td>
                <td className="admin-inventory-plan__td admin-inventory-plan__td--date">
                  <span className="admin-inventory-plan__readonly-text">
                    {formatPlanReceivingDate(draft)}
                  </span>
                </td>
                <td className="admin-inventory-plan__td admin-inventory-plan__td--quantity">
                  <span className="admin-inventory-plan__readonly-text">{formatPlanQuantity(draft)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PublicInventoryPlanPage() {
  const { t } = useLanguage();
  const { rowDrafts, isReady, error } = usePublicInventoryPlan();

  const resolvedRowDrafts = rowDrafts ?? {};

  return (
    <section aria-label={t('inventory.plan.region')} className="admin-inventory-plan">
      <header className="admin-inventory-plan__header">
        <span aria-hidden="true" className="admin-inventory-plan__emoji">
          ✦
        </span>
        <h1 className="admin-inventory-plan__title-en">{t('admin.inventory.plan.titleEn')}</h1>
        <h1 className="admin-inventory-plan__title-ar">{t('admin.inventory.plan.titleAr')}</h1>
      </header>

      {error ? <p className="inv-error">{error}</p> : null}

      {!isReady ? (
        <p className="admin-inventory-plan__loading">{t('inventory.plan.loading')}</p>
      ) : error ? null : (
        <div
          aria-label={t('admin.inventory.plan.tableRegion')}
          className="admin-inventory-plan__table-shell"
        >
          <div className="admin-inventory-plan__accordion-list">
            {PLAN_DEPARTMENTS.map((departmentId) => {
              const labelKey = PLAN_DEPARTMENT_LABEL_KEYS[departmentId];

              return (
                <PublicPlanAccordionSection
                  key={departmentId}
                  titleAr={dictionaries.ar[labelKey]}
                  titleEn={dictionaries.en[labelKey]}
                >
                  <PublicPlanDepartmentTable
                    departmentId={departmentId}
                    rowDrafts={resolvedRowDrafts}
                    t={t}
                  />
                </PublicPlanAccordionSection>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

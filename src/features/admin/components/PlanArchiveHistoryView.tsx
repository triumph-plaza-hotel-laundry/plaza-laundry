import { useMemo } from 'react';
import {
  getCustomCategoriesForDepartment,
  resolveCategoryLabel,
  resolveVariantLabel,
} from '@/features/inventory/department-items-catalog';
import {
  PLAN_DEPARTMENTS,
  PLAN_DEPARTMENT_LABEL_KEYS,
  PLAN_ITEM_BLANK_OPTION_LABEL,
  buildDepartmentRows,
  formatPlanQuantity,
  formatPlanReceivingDate,
  type PlanDepartmentId,
  type PlanRowId,
} from '@/features/inventory/inventory-plan-schema';
import type {
  PlanRowDraft,
  PlanRowDrafts,
} from '@/features/inventory/monthly-archive-types';
import { useDepartmentItemsCatalog } from '@/hooks/useDepartmentItems';
import { useLanguage } from '@/hooks';

function isPlanDraftLogged(draft: PlanRowDraft | undefined): boolean {
  if (!draft) {
    return false;
  }

  return Boolean(
    draft.itemVariant.trim() ||
      draft.quantity.trim() ||
      draft.day.trim() ||
      draft.month.trim() ||
      draft.year.trim(),
  );
}

type PlanHistoryEntry = {
  rowId: PlanRowId;
  departmentId: PlanDepartmentId;
  categoryLabel: string;
  draft: PlanRowDraft;
};

type PlanArchiveHistoryViewProps = {
  rowDrafts: PlanRowDrafts;
};

export function PlanArchiveHistoryView({
  rowDrafts,
}: PlanArchiveHistoryViewProps) {
  const { t } = useLanguage();
  const {
    items: catalog,
    categories,
    isReady,
    error,
  } = useDepartmentItemsCatalog();

  const entries = useMemo(() => {
    const next: PlanHistoryEntry[] = [];

    for (const departmentId of PLAN_DEPARTMENTS) {
      const rows = buildDepartmentRows(
        departmentId,
        getCustomCategoriesForDepartment(
          categories,
          departmentId,
          catalog,
          rowDrafts,
        ),
      );

      for (const row of rows) {
        const draft = rowDrafts[row.id] as PlanRowDraft | undefined;
        if (!isPlanDraftLogged(draft)) {
          continue;
        }

        next.push({
          rowId: row.id,
          departmentId,
          categoryLabel: resolveCategoryLabel(
            row.itemKey,
            departmentId,
            categories,
            t,
          ),
          draft: draft!,
        });
      }
    }

    return next;
  }, [catalog, categories, rowDrafts, t]);

  if (!isReady) {
    return (
      <p className="admin-inventory-plan__loading">
        {t('inventory.plan.loading')}
      </p>
    );
  }

  if (error) {
    return (
      <p className="inv-error" role="alert">
        {error}
      </p>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="inv-empty">
        <p>{t('admin.inventory.history.planEmpty')}</p>
      </div>
    );
  }

  return (
    <div className="inv-table-wrap inv-table-wrap--erp">
      <table className="luxury-table inv-erp-table inv-erp-table--history">
        <thead>
          <tr>
            <th scope="col">{t('admin.inventory.plan.table.department')}</th>
            <th scope="col">{t('admin.inventory.plan.table.category')}</th>
            <th scope="col">{t('inventory.plan.table.selectedUniform')}</th>
            <th scope="col">{t('admin.inventory.plan.table.lastReceiptDate')}</th>
            <th className="inv-erp-table__num" scope="col">
              {t('admin.inventory.plan.table.quantityPerEmployee')}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.rowId}>
              <td>{t(PLAN_DEPARTMENT_LABEL_KEYS[entry.departmentId])}</td>
              <td>{entry.categoryLabel}</td>
              <td>
                {entry.draft.itemVariant.trim()
                  ? resolveVariantLabel(entry.draft.itemVariant, catalog, t)
                  : PLAN_ITEM_BLANK_OPTION_LABEL}
              </td>
              <td>{formatPlanReceivingDate(entry.draft)}</td>
              <td className="inv-erp-table__num">
                {formatPlanQuantity(entry.draft)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

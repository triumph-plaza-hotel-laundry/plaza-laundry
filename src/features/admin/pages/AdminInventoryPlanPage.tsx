import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useInventoryArchive } from '@/features/admin/context/useInventoryArchive';
import {
  getCatalogOptionsForRow,
  getCustomCategoriesForDepartment,
  logEmptyPlanDropdownRows,
  resolveCategoryLabel,
  withPersistedVariantOption,
} from '@/features/inventory/department-items-catalog';
import type {
  DepartmentItem,
  DepartmentItemCategory,
} from '@/features/inventory/department-items-types';
import type { PlanRowDraft } from '@/features/inventory/monthly-archive-types';
import {
  PLAN_DEPARTMENTS,
  PLAN_DEPARTMENT_LABEL_KEYS,
  PLAN_ITEM_BLANK_OPTION_LABEL,
  buildDepartmentRows,
  type PlanDepartmentId,
  type PlanRowId,
} from '@/features/inventory/inventory-plan-schema';
import { mergePlanRowDrafts } from '@/features/inventory/plan-document-service';
import { useDepartmentItemsCatalog } from '@/hooks/useDepartmentItems';
import { dictionaries } from '@/i18n/dictionaries';
import { useLanguage } from '@/hooks';
import type { TranslationKey } from '@/types/language';

function PlanItemSelect({
  disabled,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (nextValue: string) => void;
}) {
  return (
    <select
      aria-label={label}
      className="admin-inventory-plan__item-select"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      <option value="">{PLAN_ITEM_BLANK_OPTION_LABEL}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function PlanDateFields({
  disabled,
  labels,
  onChange,
  value,
}: {
  disabled?: boolean;
  labels: { day: string; month: string; year: string };
  value: PlanRowDraft;
  onChange: (field: 'day' | 'month' | 'year', nextValue: string) => void;
}) {
  const days = useMemo(
    () => Array.from({ length: 31 }, (_, index) => String(index + 1)),
    [],
  );
  const months = useMemo(
    () => Array.from({ length: 12 }, (_, index) => String(index + 1)),
    [],
  );
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 21 }, (_, index) =>
      String(currentYear - 10 + index),
    );
  }, []);

  return (
    <div className="admin-inventory-plan__date-fields">
      <select
        aria-label={labels.day}
        className="admin-inventory-plan__date-select"
        disabled={disabled}
        onChange={(event) => onChange('day', event.target.value)}
        value={value.day}
      >
        <option value="">{labels.day}</option>
        {days.map((day) => (
          <option key={day} value={day}>
            {day}
          </option>
        ))}
      </select>
      <select
        aria-label={labels.month}
        className="admin-inventory-plan__date-select"
        disabled={disabled}
        onChange={(event) => onChange('month', event.target.value)}
        value={value.month}
      >
        <option value="">{labels.month}</option>
        {months.map((month) => (
          <option key={month} value={month}>
            {month}
          </option>
        ))}
      </select>
      <select
        aria-label={labels.year}
        className="admin-inventory-plan__date-select admin-inventory-plan__date-select--year"
        disabled={disabled}
        onChange={(event) => onChange('year', event.target.value)}
        value={value.year}
      >
        <option value="">{labels.year}</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}

function PlanDepartmentTable({
  catalog,
  categories,
  dateLabels,
  departmentId,
  disabled,
  onQuantityChange,
  onRowDateChange,
  onRowDraftChange,
  rowDrafts,
  t,
}: {
  catalog: readonly DepartmentItem[];
  categories: readonly DepartmentItemCategory[];
  dateLabels: { day: string; month: string; year: string };
  departmentId: PlanDepartmentId;
  disabled?: boolean;
  onQuantityChange: (rowId: PlanRowId, nextValue: string) => void;
  onRowDateChange: (
    rowId: PlanRowId,
    field: 'day' | 'month' | 'year',
    nextValue: string,
  ) => void;
  onRowDraftChange: (rowId: PlanRowId, patch: Partial<PlanRowDraft>) => void;
  rowDrafts: Record<PlanRowId, PlanRowDraft>;
  t: (key: TranslationKey) => string;
}) {
  const rows = buildDepartmentRows(
    departmentId,
    getCustomCategoriesForDepartment(
      categories,
      departmentId,
      catalog,
      rowDrafts,
    ),
  );

  return (
    <div className="admin-inventory-plan__table-wrap">
      <table className="admin-inventory-plan__table" dir="rtl">
        <colgroup>
          <col className="admin-inventory-plan__col--category" />
          <col className="admin-inventory-plan__col--date" />
          <col className="admin-inventory-plan__col--quantity" />
        </colgroup>
        <thead>
          <tr>
            <th className="admin-inventory-plan__th" scope="col">
              {t('admin.inventory.plan.table.category')}
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
            const draft =
              rowDrafts[row.id] ??
              ({
                day: '',
                month: '',
                year: '',
                quantity: '',
                itemVariant: '',
              } satisfies PlanRowDraft);

            const options = withPersistedVariantOption(
              getCatalogOptionsForRow(catalog, departmentId, row.itemKey, t),
              draft.itemVariant,
              catalog,
              t,
            );

            return (
              <tr className="admin-inventory-plan__row" key={row.id}>
                <td className="admin-inventory-plan__td admin-inventory-plan__td--category">
                  <PlanItemSelect
                    disabled={disabled}
                    label={resolveCategoryLabel(
                      row.itemKey,
                      departmentId,
                      categories,
                      t,
                    )}
                    onChange={(nextValue) =>
                      onRowDraftChange(row.id, { itemVariant: nextValue })
                    }
                    options={options}
                    value={draft.itemVariant}
                  />
                </td>
                <td className="admin-inventory-plan__td admin-inventory-plan__td--date">
                  <PlanDateFields
                    disabled={disabled}
                    labels={dateLabels}
                    onChange={(field, nextValue) =>
                      onRowDateChange(row.id, field, nextValue)
                    }
                    value={draft}
                  />
                </td>
                <td className="admin-inventory-plan__td admin-inventory-plan__td--quantity">
                  <input
                    aria-label={t('admin.inventory.plan.quantity.label')}
                    className="admin-inventory-plan__quantity-input"
                    disabled={disabled}
                    inputMode="numeric"
                    min={1}
                    onChange={(event) =>
                      onQuantityChange(row.id, event.target.value)
                    }
                    step={1}
                    type="number"
                    value={draft.quantity}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PlanAccordionSection({
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
    <div
      className={`org-accordion__section${isOpen ? 'org-accordion__section--open' : ''}`}
    >
      <button
        aria-expanded={isOpen}
        className="org-accordion__trigger"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <ChevronDown
          aria-hidden="true"
          className="org-accordion__chevron"
          strokeWidth={1.75}
        />
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

export function AdminInventoryPlanPage() {
  const { t } = useLanguage();
  const archive = useInventoryArchive();
  const {
    items: catalog,
    categories,
    isReady: catalogReady,
    error: catalogError,
  } = useDepartmentItemsCatalog();
  const [rowDrafts, setRowDrafts] = useState<Record<PlanRowId, PlanRowDraft>>(
    () =>
      mergePlanRowDrafts(undefined, categories) as Record<
        PlanRowId,
        PlanRowDraft
      >,
  );
  const saveTimerRef = useRef<number | null>(null);
  const liveHydratedRef = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const readOnly = archive.isArchiveView;

  useEffect(() => {
    if (!catalogReady || !archive.isReady) {
      return;
    }

    logEmptyPlanDropdownRows(catalog, categories, rowDrafts, t);
  }, [archive.isReady, catalog, catalogReady, categories, rowDrafts, t]);

  useEffect(() => {
    if (!archive.isReady) {
      return;
    }

    if (archive.isArchiveView && archive.viewingArchive) {
      setRowDrafts(
        mergePlanRowDrafts(
          archive.viewingArchive.planData.rowDrafts,
          categories,
        ) as Record<PlanRowId, PlanRowDraft>,
      );
      return;
    }

    if (!liveHydratedRef.current && archive.planDocument) {
      setRowDrafts(
        mergePlanRowDrafts(
          archive.planDocument.rowDrafts,
          categories,
        ) as Record<PlanRowId, PlanRowDraft>,
      );
      liveHydratedRef.current = true;
    }
  }, [
    archive.isArchiveView,
    archive.isReady,
    archive.planDocument,
    archive.viewingArchive,
    categories,
  ]);

  useEffect(() => {
    if (!archive.isArchiveView && archive.isReady && archive.planDocument) {
      setRowDrafts(
        mergePlanRowDrafts(
          archive.planDocument.rowDrafts,
          categories,
        ) as Record<PlanRowId, PlanRowDraft>,
      );
    }
  }, [
    archive.isArchiveView,
    archive.isReady,
    archive.planDocument,
    categories,
  ]);

  useEffect(() => {
    setRowDrafts(
      (current) =>
        mergePlanRowDrafts(current, categories) as Record<
          PlanRowId,
          PlanRowDraft
        >,
    );
  }, [categories]);

  useEffect(() => {
    if (!archive.isReady || readOnly || !liveHydratedRef.current) {
      return;
    }

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      void archive
        .savePlanDrafts(rowDrafts)
        .then(() => setSaveError(null))
        .catch((caught) => {
          setSaveError(
            caught instanceof Error
              ? caught.message
              : 'Failed to save inventory plan.',
          );
        });
    }, 700);

    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [archive, readOnly, rowDrafts]);

  const dateLabels = {
    day: t('admin.inventory.plan.date.day'),
    month: t('admin.inventory.plan.date.month'),
    year: t('admin.inventory.plan.date.year'),
  };

  const updateRowDraft = (rowId: PlanRowId, patch: Partial<PlanRowDraft>) => {
    if (readOnly) {
      return;
    }

    setRowDrafts((current) => ({
      ...current,
      [rowId]: {
        ...current[rowId],
        ...patch,
      },
    }));
  };

  const updateRowDate = (
    rowId: PlanRowId,
    field: 'day' | 'month' | 'year',
    nextValue: string,
  ) => {
    updateRowDraft(rowId, { [field]: nextValue });
  };

  const updateRowQuantity = (rowId: PlanRowId, nextValue: string) => {
    if (readOnly) {
      return;
    }

    if (nextValue === '') {
      updateRowDraft(rowId, { quantity: '' });
      return;
    }

    if (/^[1-9]\d*$/.test(nextValue)) {
      updateRowDraft(rowId, { quantity: nextValue });
    }
  };

  return (
    <section
      aria-label={t('admin.inventory.plan.region')}
      className="admin-inventory-plan"
    >
      <header className="admin-inventory-plan__header">
        <span aria-hidden="true" className="admin-inventory-plan__emoji">
          ✦
        </span>
        <h1 className="admin-inventory-plan__title-en">
          {t('admin.inventory.plan.titleEn')}
        </h1>
        <h1 className="admin-inventory-plan__title-ar">
          {t('admin.inventory.plan.titleAr')}
        </h1>
      </header>

      {!catalogReady ? (
        <p className="admin-inventory-plan__loading">
          {t('inventory.plan.loading')}
        </p>
      ) : catalogError ? (
        <p className="inv-error" role="alert">
          {catalogError}
        </p>
      ) : (
        <>
          {saveError ? (
            <p className="inv-error" role="alert">
              {saveError}
            </p>
          ) : null}
          <div
            aria-label={t('admin.inventory.plan.tableRegion')}
            className="admin-inventory-plan__table-shell"
          >
            <div className="admin-inventory-plan__accordion-list">
              {PLAN_DEPARTMENTS.map((departmentId) => {
                const labelKey = PLAN_DEPARTMENT_LABEL_KEYS[departmentId];

                return (
                  <PlanAccordionSection
                    key={departmentId}
                    titleAr={dictionaries.ar[labelKey]}
                    titleEn={dictionaries.en[labelKey]}
                  >
                    <PlanDepartmentTable
                      catalog={catalog}
                      categories={categories}
                      dateLabels={dateLabels}
                      departmentId={departmentId}
                      disabled={readOnly}
                      onQuantityChange={updateRowQuantity}
                      onRowDateChange={updateRowDate}
                      onRowDraftChange={updateRowDraft}
                      rowDrafts={rowDrafts}
                      t={t}
                    />
                  </PlanAccordionSection>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

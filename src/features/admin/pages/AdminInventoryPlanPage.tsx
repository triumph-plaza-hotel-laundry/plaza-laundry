import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useInventoryArchive } from '@/features/admin/context/useInventoryArchive';
import type { PlanRowDraft } from '@/features/inventory/monthly-archive-types';
import { mergePlanRowDrafts } from '@/features/inventory/plan-document-service';
import { dictionaries } from '@/i18n/dictionaries';
import { useLanguage } from '@/hooks';
import type { TranslationKey } from '@/types/language';

type PlanDepartmentId =
  | 'directors'
  | 'frontOffice'
  | 'personnelAffairs'
  | 'informationTechnology'
  | 'audioEngineering'
  | 'sales'
  | 'publicRelations'
  | 'driversSecretariat'
  | 'accounts'
  | 'foodBeverageBanquets'
  | 'security'
  | 'housekeeping'
  | 'kitchen'
  | 'laundry'
  | 'stewarding'
  | 'maintenance'
  | 'purchasing'
  | 'gym';

type PlanItemKey =
  | 'suit'
  | 'suit2'
  | 'womens'
  | 'balman'
  | 'shirt'
  | 'shirt2'
  | 'shirt3'
  | 'blouse'
  | 'tie'
  | 'pants'
  | 'pants2'
  | 'tshirt'
  | 'tshirt2'
  | 'jacket'
  | 'kitchenJacket'
  | 'kitchenJacket2'
  | 'kitchenJacket3'
  | 'apron'
  | 'apron2'
  | 'hkKit'
  | 'hkKit2'
  | 'headCover'
  | 'coat'
  | 'supervisionKit'
  | 'workersKit'
  | 'sportsTracksuit'
  | 'sportsTshirt'
  | 'sportsPants'
  | 'sportsShorts';

type PlanRowId = `${PlanDepartmentId}-${PlanItemKey}`;

const PLAN_ITEM_BLANK_OPTION_LABEL = 'ــــــــــــ';

const PLAN_DEPARTMENTS: readonly PlanDepartmentId[] = [
  'directors',
  'frontOffice',
  'personnelAffairs',
  'informationTechnology',
  'audioEngineering',
  'sales',
  'publicRelations',
  'driversSecretariat',
  'accounts',
  'foodBeverageBanquets',
  'security',
  'housekeeping',
  'kitchen',
  'laundry',
  'stewarding',
  'maintenance',
  'purchasing',
  'gym',
];

const PLAN_DEPARTMENT_LABEL_KEYS: Record<PlanDepartmentId, TranslationKey> = {
  directors: 'admin.inventory.plan.sections.directors',
  frontOffice: 'admin.inventory.plan.directorsSub.frontOffice',
  personnelAffairs: 'admin.inventory.plan.directorsSub.personnelAffairs',
  informationTechnology: 'admin.inventory.plan.directorsSub.informationTechnology',
  audioEngineering: 'admin.inventory.plan.directorsSub.audioEngineering',
  sales: 'admin.inventory.plan.directorsSub.sales',
  publicRelations: 'admin.inventory.plan.directorsSub.publicRelations',
  driversSecretariat: 'admin.inventory.plan.directorsSub.driversSecretariat',
  accounts: 'admin.inventory.plan.sections.accounts',
  foodBeverageBanquets: 'admin.inventory.plan.sections.foodBeverageBanquets',
  security: 'admin.inventory.plan.sections.security',
  housekeeping: 'admin.inventory.plan.sections.housekeeping',
  kitchen: 'admin.inventory.plan.sections.kitchen',
  laundry: 'admin.inventory.plan.sections.laundry',
  stewarding: 'admin.inventory.plan.sections.stewarding',
  maintenance: 'admin.inventory.plan.sections.maintenance',
  purchasing: 'admin.inventory.plan.sections.purchasing',
  gym: 'admin.inventory.plan.sections.gym',
};

const PLAN_DEPARTMENT_ITEMS: Record<PlanDepartmentId, readonly PlanItemKey[]> = {
  directors: ['suit', 'shirt', 'tie'],
  frontOffice: ['suit', 'womens', 'balman', 'shirt', 'blouse', 'tie'],
  personnelAffairs: ['suit', 'shirt', 'tie'],
  informationTechnology: ['suit', 'shirt', 'tie'],
  audioEngineering: ['suit', 'shirt', 'tie'],
  sales: ['suit', 'womens', 'shirt', 'blouse', 'tie'],
  publicRelations: ['suit', 'shirt', 'tie'],
  driversSecretariat: ['suit', 'shirt', 'tie'],
  accounts: ['suit', 'shirt', 'tie', 'pants', 'tshirt', 'tshirt2', 'jacket'],
  foodBeverageBanquets: ['suit', 'shirt', 'shirt2', 'tie', 'pants', 'apron', 'apron2', 'jacket', 'kitchenJacket'],
  security: ['suit', 'suit2', 'shirt', 'shirt2', 'shirt3', 'pants', 'jacket', 'tie', 'coat'],
  housekeeping: ['suit', 'suit2', 'shirt', 'shirt2', 'shirt3', 'hkKit', 'hkKit2', 'pants', 'tie', 'headCover'],
  kitchen: ['kitchenJacket', 'kitchenJacket2', 'kitchenJacket3', 'apron', 'apron2', 'pants', 'pants2'],
  laundry: ['pants', 'pants2', 'tshirt', 'tshirt2', 'shirt'],
  stewarding: ['shirt', 'pants', 'supervisionKit', 'workersKit'],
  maintenance: ['shirt', 'pants', 'supervisionKit', 'workersKit'],
  purchasing: ['shirt', 'pants'],
  gym: ['sportsTracksuit', 'sportsTshirt', 'sportsPants', 'sportsShorts'],
};

const ACCOUNTS_SUIT_VARIANTS = [
  'admin.inventory.plan.items.suit.black',
  'admin.inventory.plan.items.suit.navy',
  'admin.inventory.plan.items.suit.grey',
  'admin.inventory.plan.items.suit.womens',
  'admin.inventory.plan.items.suit.balman',
] as const satisfies readonly TranslationKey[];

const ACCOUNTS_SHIRT_VARIANTS = [
  'admin.inventory.plan.items.shirt.white',
  'admin.inventory.plan.items.shirt.beige',
  'admin.inventory.plan.items.shirt.striped',
  'admin.inventory.plan.items.shirt.halfCollar',
  'admin.inventory.plan.items.shirt.blouse',
] as const satisfies readonly TranslationKey[];

const ITEM_VARIANT_KEYS: Record<PlanItemKey, readonly TranslationKey[]> = {
  suit: [
    'admin.inventory.plan.items.suit.black',
    'admin.inventory.plan.items.suit.navy',
    'admin.inventory.plan.items.suit.grey',
  ],
  suit2: ACCOUNTS_SUIT_VARIANTS,
  womens: ['admin.inventory.plan.items.suit.womens'],
  balman: ['admin.inventory.plan.items.suit.balman'],
  shirt: [
    'admin.inventory.plan.items.shirt.white',
    'admin.inventory.plan.items.shirt.beige',
    'admin.inventory.plan.items.shirt.striped',
    'admin.inventory.plan.items.shirt.halfCollar',
  ],
  shirt2: ACCOUNTS_SHIRT_VARIANTS,
  shirt3: ACCOUNTS_SHIRT_VARIANTS,
  blouse: ['admin.inventory.plan.items.shirt.blouse'],
  tie: [
    'admin.inventory.plan.items.tie.navy',
    'admin.inventory.plan.items.tie.black',
    'admin.inventory.plan.items.tie.wine',
    'admin.inventory.plan.items.tie.grey',
  ],
  pants: [
    'admin.inventory.plan.items.pants.black',
    'admin.inventory.plan.items.pants.navy',
    'admin.inventory.plan.items.pants.white',
    'admin.inventory.plan.items.pants.womens',
  ],
  pants2: [
    'admin.inventory.plan.items.pants.black',
    'admin.inventory.plan.items.pants.navy',
    'admin.inventory.plan.items.pants.white',
    'admin.inventory.plan.items.pants.womens',
  ],
  tshirt: [
    'admin.inventory.plan.items.tshirt.wineLong',
    'admin.inventory.plan.items.tshirt.wineShort',
    'admin.inventory.plan.items.tshirt.navyLong',
    'admin.inventory.plan.items.tshirt.navyShort',
    'admin.inventory.plan.items.tshirt.greyLong',
    'admin.inventory.plan.items.tshirt.greyShort',
    'admin.inventory.plan.items.tshirt.blackLong',
    'admin.inventory.plan.items.tshirt.blackShort',
    'admin.inventory.plan.items.tshirt.whiteLong',
    'admin.inventory.plan.items.tshirt.whiteShort',
  ],
  tshirt2: [
    'admin.inventory.plan.items.tshirt.wineLong',
    'admin.inventory.plan.items.tshirt.wineShort',
    'admin.inventory.plan.items.tshirt.navyLong',
    'admin.inventory.plan.items.tshirt.navyShort',
    'admin.inventory.plan.items.tshirt.greyLong',
    'admin.inventory.plan.items.tshirt.greyShort',
    'admin.inventory.plan.items.tshirt.blackLong',
    'admin.inventory.plan.items.tshirt.blackShort',
    'admin.inventory.plan.items.tshirt.whiteLong',
    'admin.inventory.plan.items.tshirt.whiteShort',
  ],
  jacket: [
    'admin.inventory.plan.items.jacket.cold',
    'admin.inventory.plan.items.jacket.navy',
    'admin.inventory.plan.items.jacket.black',
  ],
  kitchenJacket: [
    'admin.inventory.plan.items.kitchenJacket.white',
    'admin.inventory.plan.items.kitchenJacket.black',
    'admin.inventory.plan.items.kitchenJacket.grey',
  ],
  kitchenJacket2: [
    'admin.inventory.plan.items.kitchenJacket.white',
    'admin.inventory.plan.items.kitchenJacket.black',
    'admin.inventory.plan.items.kitchenJacket.grey',
  ],
  kitchenJacket3: [
    'admin.inventory.plan.items.kitchenJacket.white',
    'admin.inventory.plan.items.kitchenJacket.black',
    'admin.inventory.plan.items.kitchenJacket.grey',
  ],
  apron: [
    'admin.inventory.plan.items.apron.white',
    'admin.inventory.plan.items.apron.black',
    'admin.inventory.plan.items.apron.beige',
    'admin.inventory.plan.items.apron.tan',
  ],
  apron2: [
    'admin.inventory.plan.items.apron.white',
    'admin.inventory.plan.items.apron.black',
    'admin.inventory.plan.items.apron.beige',
    'admin.inventory.plan.items.apron.tan',
  ],
  hkKit: [
    'admin.inventory.plan.items.hkKit.mens',
    'admin.inventory.plan.items.hkKit.womens',
  ],
  hkKit2: [
    'admin.inventory.plan.items.hkKit.mens',
    'admin.inventory.plan.items.hkKit.womens',
  ],
  headCover: [],
  coat: [
    'admin.inventory.plan.items.coat.black',
    'admin.inventory.plan.items.coat.navy',
  ],
  supervisionKit: [
    'admin.inventory.plan.items.supervisionKit.mens',
    'admin.inventory.plan.items.supervisionKit.womens',
  ],
  workersKit: [
    'admin.inventory.plan.items.workersKit.mens',
    'admin.inventory.plan.items.workersKit.womens',
  ],
  sportsTracksuit: [
    'admin.inventory.plan.items.sportsTracksuit.black',
    'admin.inventory.plan.items.sportsTracksuit.navy',
    'admin.inventory.plan.items.sportsTracksuit.grey',
  ],
  sportsTshirt: [
    'admin.inventory.plan.items.sportsTshirt.black',
    'admin.inventory.plan.items.sportsTshirt.white',
    'admin.inventory.plan.items.sportsTshirt.navy',
    'admin.inventory.plan.items.sportsTshirt.grey',
    'admin.inventory.plan.items.sportsTshirt.wine',
  ],
  sportsPants: [
    'admin.inventory.plan.items.sportsPants.black',
    'admin.inventory.plan.items.sportsPants.navy',
    'admin.inventory.plan.items.sportsPants.grey',
  ],
  sportsShorts: [
    'admin.inventory.plan.items.sportsShorts.black',
    'admin.inventory.plan.items.sportsShorts.navy',
    'admin.inventory.plan.items.sportsShorts.grey',
  ],
};

const ITEM_LABEL_KEYS: Record<PlanItemKey, TranslationKey> = {
  suit: 'admin.inventory.plan.items.suit',
  suit2: 'admin.inventory.plan.items.suit',
  womens: 'admin.inventory.plan.items.womensSuit',
  balman: 'admin.inventory.plan.items.balmanSuit',
  shirt: 'admin.inventory.plan.items.shirt',
  shirt2: 'admin.inventory.plan.items.shirt',
  shirt3: 'admin.inventory.plan.items.shirt',
  blouse: 'admin.inventory.plan.items.blouse',
  tie: 'admin.inventory.plan.items.tie',
  pants: 'admin.inventory.plan.items.pants',
  pants2: 'admin.inventory.plan.items.pants',
  tshirt: 'admin.inventory.plan.items.tshirt',
  tshirt2: 'admin.inventory.plan.items.tshirt',
  jacket: 'admin.inventory.plan.items.jacket',
  kitchenJacket: 'admin.inventory.plan.items.kitchenJacket',
  kitchenJacket2: 'admin.inventory.plan.items.kitchenJacket',
  kitchenJacket3: 'admin.inventory.plan.items.kitchenJacket',
  apron: 'admin.inventory.plan.items.apron',
  apron2: 'admin.inventory.plan.items.apron',
  hkKit: 'admin.inventory.plan.items.hkKit',
  hkKit2: 'admin.inventory.plan.items.hkKit',
  headCover: 'admin.inventory.plan.items.headCover',
  coat: 'admin.inventory.plan.items.coat',
  supervisionKit: 'admin.inventory.plan.items.supervisionKit',
  workersKit: 'admin.inventory.plan.items.workersKit',
  sportsTracksuit: 'admin.inventory.plan.items.sportsTracksuit',
  sportsTshirt: 'admin.inventory.plan.items.sportsTshirt',
  sportsPants: 'admin.inventory.plan.items.sportsPants',
  sportsShorts: 'admin.inventory.plan.items.sportsShorts',
};

function getDepartmentItemVariants(
  departmentId: PlanDepartmentId,
  itemKey: PlanItemKey,
): readonly TranslationKey[] {
  if (departmentId === 'accounts') {
    if (itemKey === 'suit') {
      return ACCOUNTS_SUIT_VARIANTS;
    }

    if (itemKey === 'shirt') {
      return ACCOUNTS_SHIRT_VARIANTS;
    }
  }

  if (departmentId === 'foodBeverageBanquets') {
    if (itemKey === 'suit') {
      return ACCOUNTS_SUIT_VARIANTS;
    }

    if (itemKey === 'shirt' || itemKey === 'shirt2') {
      return ACCOUNTS_SHIRT_VARIANTS;
    }
  }

  if (departmentId === 'security') {
    if (itemKey === 'suit' || itemKey === 'suit2') {
      return ACCOUNTS_SUIT_VARIANTS;
    }

    if (itemKey === 'shirt' || itemKey === 'shirt2' || itemKey === 'shirt3') {
      return ACCOUNTS_SHIRT_VARIANTS;
    }
  }

  if (departmentId === 'housekeeping') {
    if (itemKey === 'suit' || itemKey === 'suit2') {
      return ACCOUNTS_SUIT_VARIANTS;
    }

    if (itemKey === 'shirt' || itemKey === 'shirt2' || itemKey === 'shirt3') {
      return ACCOUNTS_SHIRT_VARIANTS;
    }
  }

  if (departmentId === 'laundry') {
    if (itemKey === 'shirt') {
      return ACCOUNTS_SHIRT_VARIANTS;
    }
  }

  if (departmentId === 'stewarding') {
    if (itemKey === 'shirt') {
      return ACCOUNTS_SHIRT_VARIANTS;
    }
  }

  if (departmentId === 'maintenance') {
    if (itemKey === 'shirt') {
      return ACCOUNTS_SHIRT_VARIANTS;
    }

    if (itemKey === 'supervisionKit') {
      return ['admin.inventory.plan.items.supervisionKit.mens'];
    }

    if (itemKey === 'workersKit') {
      return ['admin.inventory.plan.items.workersKit.mens'];
    }
  }

  if (departmentId === 'purchasing') {
    if (itemKey === 'shirt') {
      return ACCOUNTS_SHIRT_VARIANTS;
    }
  }

  return ITEM_VARIANT_KEYS[itemKey];
}

const ALL_PLAN_VARIANT_KEYS: readonly TranslationKey[] = [
  ...new Set([
    ...Object.values(ITEM_VARIANT_KEYS).flat(),
    ...ACCOUNTS_SUIT_VARIANTS,
    ...ACCOUNTS_SHIRT_VARIANTS,
  ]),
];

function buildDepartmentRows(departmentId: PlanDepartmentId) {
  return PLAN_DEPARTMENT_ITEMS[departmentId].map((itemKey) => ({
    id: `${departmentId}-${itemKey}` as PlanRowId,
    itemKey,
  }));
}

function PlanItemSelect({
  disabled,
  label,
  onChange,
  value,
  variantKeys,
  variantLabels,
}: {
  disabled?: boolean;
  label: string;
  value: string;
  variantKeys: readonly TranslationKey[];
  variantLabels: Record<string, string>;
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
      {variantKeys.map((variantKey) => (
        <option key={variantKey} value={variantKey}>
          {variantLabels[variantKey]}
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
  const days = useMemo(() => Array.from({ length: 31 }, (_, index) => String(index + 1)), []);
  const months = useMemo(() => Array.from({ length: 12 }, (_, index) => String(index + 1)), []);
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 21 }, (_, index) => String(currentYear - 10 + index));
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
  dateLabels,
  departmentId,
  disabled,
  onQuantityChange,
  onRowDateChange,
  onRowDraftChange,
  rowDrafts,
  rows,
  t,
  variantLabels,
}: {
  dateLabels: { day: string; month: string; year: string };
  departmentId: PlanDepartmentId;
  disabled?: boolean;
  onQuantityChange: (rowId: PlanRowId, nextValue: string) => void;
  onRowDateChange: (rowId: PlanRowId, field: 'day' | 'month' | 'year', nextValue: string) => void;
  onRowDraftChange: (rowId: PlanRowId, patch: Partial<PlanRowDraft>) => void;
  rowDrafts: Record<PlanRowId, PlanRowDraft>;
  rows: ReturnType<typeof buildDepartmentRows>;
  t: (key: TranslationKey) => string;
  variantLabels: Record<string, string>;
}) {
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
          {rows.map((row) => (
            <tr className="admin-inventory-plan__row" key={row.id}>
              <td className="admin-inventory-plan__td admin-inventory-plan__td--category">
                <PlanItemSelect
                  disabled={disabled}
                  label={t(ITEM_LABEL_KEYS[row.itemKey])}
                  onChange={(nextValue) => onRowDraftChange(row.id, { itemVariant: nextValue })}
                  value={rowDrafts[row.id].itemVariant}
                  variantKeys={getDepartmentItemVariants(departmentId, row.itemKey)}
                  variantLabels={variantLabels}
                />
              </td>
              <td className="admin-inventory-plan__td admin-inventory-plan__td--date">
                <PlanDateFields
                  disabled={disabled}
                  labels={dateLabels}
                  onChange={(field, nextValue) => onRowDateChange(row.id, field, nextValue)}
                  value={rowDrafts[row.id]}
                />
              </td>
              <td className="admin-inventory-plan__td admin-inventory-plan__td--quantity">
                <input
                  aria-label={t('admin.inventory.plan.quantity.label')}
                  className="admin-inventory-plan__quantity-input"
                  disabled={disabled}
                  inputMode="numeric"
                  min={1}
                  onChange={(event) => onQuantityChange(row.id, event.target.value)}
                  step={1}
                  type="number"
                  value={rowDrafts[row.id].quantity}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type PlanAccordionSectionProps = {
  children: ReactNode;
  titleAr: string;
  titleEn: string;
};

function PlanAccordionSection({ children, titleAr, titleEn }: PlanAccordionSectionProps) {
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

export function AdminInventoryPlanPage() {
  const { t } = useLanguage();
  const archive = useInventoryArchive();
  const [rowDrafts, setRowDrafts] = useState<Record<PlanRowId, PlanRowDraft>>(() =>
    mergePlanRowDrafts() as Record<PlanRowId, PlanRowDraft>,
  );
  const saveTimerRef = useRef<number | null>(null);
  const liveHydratedRef = useRef(false);
  const readOnly = archive.isArchiveView;

  useEffect(() => {
    if (!archive.isReady) {
      return;
    }

    if (archive.isArchiveView && archive.viewingArchive) {
      setRowDrafts(mergePlanRowDrafts(archive.viewingArchive.planData.rowDrafts) as Record<PlanRowId, PlanRowDraft>);
      return;
    }

    if (!liveHydratedRef.current && archive.planDocument) {
      setRowDrafts(mergePlanRowDrafts(archive.planDocument.rowDrafts) as Record<PlanRowId, PlanRowDraft>);
      liveHydratedRef.current = true;
    }
  }, [archive.isArchiveView, archive.isReady, archive.planDocument, archive.viewingArchive]);

  useEffect(() => {
    if (!archive.isArchiveView && archive.isReady && archive.planDocument) {
      setRowDrafts(mergePlanRowDrafts(archive.planDocument.rowDrafts) as Record<PlanRowId, PlanRowDraft>);
    }
  }, [archive.isArchiveView, archive.isReady, archive.planDocument]);

  useEffect(() => {
    if (!archive.isReady || readOnly || !liveHydratedRef.current) {
      return;
    }

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      void archive.savePlanDrafts(rowDrafts).catch(() => {});
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

  const updateRowDate = (rowId: PlanRowId, field: 'day' | 'month' | 'year', nextValue: string) => {
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

  const variantLabels = useMemo(
    () =>
      ALL_PLAN_VARIANT_KEYS.reduce<Record<string, string>>((labels, variantKey) => {
        labels[variantKey] = t(variantKey);
        return labels;
      }, {}),
    [t],
  );

  return (
    <section aria-label={t('admin.inventory.plan.region')} className="admin-inventory-plan">
      <header className="admin-inventory-plan__header">
        <span aria-hidden="true" className="admin-inventory-plan__emoji">
          ✦
        </span>
        <h1 className="admin-inventory-plan__title-en">{t('admin.inventory.plan.titleEn')}</h1>
        <h1 className="admin-inventory-plan__title-ar">{t('admin.inventory.plan.titleAr')}</h1>
      </header>

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
                  dateLabels={dateLabels}
                  departmentId={departmentId}
                  disabled={readOnly}
                  onQuantityChange={updateRowQuantity}
                  onRowDateChange={updateRowDate}
                  onRowDraftChange={updateRowDraft}
                  rowDrafts={rowDrafts}
                  rows={buildDepartmentRows(departmentId)}
                  t={t}
                  variantLabels={variantLabels}
                />
              </PlanAccordionSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}

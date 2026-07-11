import type {
  PlanRowDraft,
  PlanRowDrafts,
} from '@/features/inventory/monthly-archive-types';
import type { PlanDepartmentRow } from '@/features/inventory/department-items-types';
import type { TranslationKey } from '@/types/language';

export type PlanDepartmentId =
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

export type PlanItemKey =
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

export type PlanRowId = `${PlanDepartmentId}-${string}`;

export const PLAN_ITEM_BLANK_OPTION_LABEL = 'ــــــــــــ';

export const PLAN_DEPARTMENTS: readonly PlanDepartmentId[] = [
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

export const PLAN_DEPARTMENT_LABEL_KEYS: Record<
  PlanDepartmentId,
  TranslationKey
> = {
  directors: 'admin.inventory.plan.sections.directors',
  frontOffice: 'admin.inventory.plan.directorsSub.frontOffice',
  personnelAffairs: 'admin.inventory.plan.directorsSub.personnelAffairs',
  informationTechnology:
    'admin.inventory.plan.directorsSub.informationTechnology',
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

export const PLAN_DEPARTMENT_ITEMS: Record<
  PlanDepartmentId,
  readonly PlanItemKey[]
> = {
  directors: ['suit', 'shirt', 'tie'],
  frontOffice: ['suit', 'womens', 'balman', 'shirt', 'blouse', 'tie'],
  personnelAffairs: ['suit', 'shirt', 'tie'],
  informationTechnology: ['suit', 'shirt', 'tie'],
  audioEngineering: ['suit', 'shirt', 'tie'],
  sales: ['suit', 'womens', 'shirt', 'blouse', 'tie'],
  publicRelations: ['suit', 'shirt', 'tie'],
  driversSecretariat: ['suit', 'shirt', 'tie'],
  accounts: ['suit', 'shirt', 'tie', 'pants', 'tshirt', 'tshirt2', 'jacket'],
  foodBeverageBanquets: [
    'suit',
    'shirt',
    'shirt2',
    'tie',
    'pants',
    'apron',
    'apron2',
    'jacket',
  ],
  security: [
    'suit',
    'suit2',
    'shirt',
    'shirt2',
    'shirt3',
    'pants',
    'jacket',
    'tie',
    'coat',
  ],
  housekeeping: [
    'suit',
    'suit2',
    'shirt',
    'shirt2',
    'shirt3',
    'hkKit',
    'hkKit2',
    'pants',
    'tie',
    'headCover',
  ],
  kitchen: [
    'kitchenJacket',
    'kitchenJacket2',
    'kitchenJacket3',
    'apron',
    'apron2',
    'pants',
    'pants2',
  ],
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

export const ITEM_LABEL_KEYS: Record<PlanItemKey, TranslationKey> = {
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

export function getDepartmentItemVariants(
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

const EMPTY_ROW_DRAFT: PlanRowDraft = {
  day: '',
  month: '',
  year: '',
  quantity: '',
  itemVariant: '',
};

export function buildDepartmentRows(
  departmentId: PlanDepartmentId,
  customCategories: readonly { itemKey: string }[] = [],
): PlanDepartmentRow[] {
  const builtInKeys = PLAN_DEPARTMENT_ITEMS[departmentId];
  const builtInRows = builtInKeys.map((itemKey) => ({
    id: `${departmentId}-${itemKey}` as PlanRowId,
    itemKey,
  }));

  const customRows = customCategories
    .filter(
      (category) => !builtInKeys.includes(category.itemKey as PlanItemKey),
    )
    .map((category) => ({
      id: `${departmentId}-${category.itemKey}` as PlanRowId,
      itemKey: category.itemKey,
    }));

  return [...builtInRows, ...customRows];
}

export function createInitialPlanRowDrafts(): PlanRowDrafts {
  return PLAN_DEPARTMENTS.reduce<PlanRowDrafts>((drafts, departmentId) => {
    for (const row of buildDepartmentRows(departmentId)) {
      drafts[row.id] = { ...EMPTY_ROW_DRAFT };
    }
    return drafts;
  }, {});
}

export function isPlanRowVisible(draft: PlanRowDraft | undefined) {
  return Boolean(draft?.itemVariant?.trim());
}

export function planHasSavedRecords(rowDrafts: PlanRowDrafts) {
  return Object.values(rowDrafts).some((draft) => isPlanRowVisible(draft));
}

export function departmentHasVisibleRows(
  departmentId: PlanDepartmentId,
  rowDrafts: PlanRowDrafts,
) {
  return buildDepartmentRows(departmentId).some((row) =>
    isPlanRowVisible(rowDrafts[row.id]),
  );
}

export function formatPlanReceivingDate(draft: PlanRowDraft) {
  if (!draft.day || !draft.month || !draft.year) {
    return '—';
  }

  return `${draft.day.padStart(2, '0')}/${draft.month.padStart(2, '0')}/${draft.year}`;
}

export function formatPlanQuantity(draft: PlanRowDraft) {
  return draft.quantity.trim() || '—';
}

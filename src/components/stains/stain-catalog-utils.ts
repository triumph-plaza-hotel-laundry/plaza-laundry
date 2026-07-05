import type {
  LaundryStain,
  StainCategory,
  StainDifficulty,
} from '@/data/laundry-stains';

export type StainCatalogFilter =
  | 'all'
  | 'beverage'
  | 'food'
  | 'body'
  | 'oilFat'
  | 'cosmetic'
  | 'outdoor'
  | 'industrial'
  | 'household'
  | 'chemical';

export const stainCatalogFilters: readonly StainCatalogFilter[] = [
  'all',
  'beverage',
  'food',
  'body',
  'oilFat',
  'cosmetic',
  'outdoor',
  'industrial',
  'household',
  'chemical',
] as const;

export const difficultyLabels: Record<StainDifficulty, { en: string; ar: string }> = {
  easy: { en: 'Easy', ar: 'سهل' },
  medium: { en: 'Medium', ar: 'متوسط' },
  hard: { en: 'Hard', ar: 'صعب' },
  expert: { en: 'Expert', ar: 'خبير' },
};

export const categoryLabels: Record<StainCategory, { en: string; ar: string }> = {
  beverage: { en: 'Beverage', ar: 'مشروبات' },
  food: { en: 'Food', ar: 'طعام' },
  body: { en: 'Body', ar: 'جسم' },
  oilFat: { en: 'Oil & Fat', ar: 'زيوت ودهون' },
  cosmetic: { en: 'Cosmetic', ar: 'تجميل' },
  outdoor: { en: 'Outdoor', ar: 'خارجي' },
  industrial: { en: 'Industrial', ar: 'صناعي' },
  household: { en: 'Household', ar: 'منزلي' },
  chemical: { en: 'Chemical', ar: 'كيميائي' },
};

export function matchesStainFilter(stain: LaundryStain, filter: StainCatalogFilter): boolean {
  if (filter === 'all') {
    return true;
  }

  return stain.category === filter;
}

export function splitRemovalSteps(stain: LaundryStain): { en: string[]; ar: string[] } {
  const split = (text: string) =>
    text
      .split(/\n+/g)
      .map((line) => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);

  return {
    en: split(stain.removalSteps.en),
    ar: split(stain.removalSteps.ar),
  };
}

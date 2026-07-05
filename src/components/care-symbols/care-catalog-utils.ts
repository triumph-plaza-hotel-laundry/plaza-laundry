import type { CareLabel, CareSymbolCategory } from '@/data/care-symbols';

export type CareCatalogFilter =
  | 'all'
  | 'washing'
  | 'bleaching'
  | 'drying'
  | 'ironing'
  | 'dryCleaning';

export const careCatalogFilters: readonly CareCatalogFilter[] = [
  'all',
  'washing',
  'bleaching',
  'drying',
  'ironing',
  'dryCleaning',
] as const;

export const categoryLabels: Record<CareSymbolCategory, { en: string; ar: string }> = {
  washing: { en: 'Washing', ar: 'غسيل' },
  bleaching: { en: 'Bleaching', ar: 'تبييض' },
  drying: { en: 'Drying', ar: 'تجفيف' },
  ironing: { en: 'Ironing', ar: 'كي' },
  dryCleaning: { en: 'Dry Cleaning', ar: 'تنظيف جاف' },
};

export function matchesCareFilter(label: CareLabel, filter: CareCatalogFilter): boolean {
  if (filter === 'all') {
    return true;
  }

  return label.category === filter;
}

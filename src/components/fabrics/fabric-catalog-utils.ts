import type { LaundryFabric, FabricFilterCategory } from '@/data/repositories';
import { fabricsRepository } from '@/data/repositories';

function getAllFabrics(): LaundryFabric[] {
  return fabricsRepository.getSnapshot();
}
export type CatalogFilter =
  | 'all'
  | 'natural'
  | 'synthetic'
  | 'luxury'
  | 'hotelLinen'
  | 'uniform'
  | 'delicate';

export const catalogFilters: readonly CatalogFilter[] = [
  'all',
  'natural',
  'synthetic',
  'luxury',
  'hotelLinen',
  'uniform',
  'delicate',
] as const;

const delicateFabricIds = new Set([
  'silk',
  'satin',
  'chiffon',
  'organza',
  'lace',
  'tulle',
  'georgette',
  'crepe',
  'cashmere',
  'mohair',
  'alpaca',
  'velvet',
  'viscose',
  'modal',
  'lyocell',
  'rayon',
  'egyptian-cotton',
  'organic-cotton',
]);

const badgePriority: FabricFilterCategory[] = [
  'luxury',
  'natural',
  'synthetic',
  'blended',
  'hotelLinen',
  'uniform',
];

export function isDelicateFabric(fabric: LaundryFabric): boolean {
  if (delicateFabricIds.has(fabric.id)) {
    return true;
  }

  const program = fabric.washingProgram.en.toLowerCase();
  return program.includes('delicate') || program.includes('wool');
}

export function matchesCatalogFilter(
  fabric: LaundryFabric,
  filter: CatalogFilter,
): boolean {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'delicate') {
    return isDelicateFabric(fabric);
  }

  return fabric.categories.includes(filter);
}

export function getCategoryBadge(fabric: LaundryFabric): FabricFilterCategory {
  return (
    badgePriority.find((category) => fabric.categories.includes(category)) ??
    fabric.categories[0]
  );
}

export function inferSpinSpeed(fabric: LaundryFabric): {
  en: string;
  ar: string;
} {
  const program = fabric.washingProgram.en.toLowerCase();

  if (
    program.includes('delicate') ||
    program.includes('wool') ||
    program.includes('silk')
  ) {
    return { en: '400 RPM', ar: '400 دورة/د' };
  }

  if (program.includes('hotel linen') || program.includes('towel')) {
    return { en: '800 RPM', ar: '800 دورة/د' };
  }

  if (program.includes('heavy') || program.includes('duvet')) {
    return { en: '500–900 RPM', ar: '500–900 دورة/د' };
  }

  return { en: '600 RPM', ar: '600 دورة/د' };
}

export function splitHotelUses(fabric: LaundryFabric): {
  en: string[];
  ar: string[];
} {
  const split = (text: string) =>
    text
      .split(/[,،;]/g)
      .map((part) => part.trim())
      .filter(Boolean);

  return {
    en: split(fabric.hotelUses.en),
    ar: split(fabric.hotelUses.ar),
  };
}

export function getRelatedFabrics(
  fabric: LaundryFabric,
  limit = 4,
): LaundryFabric[] {
  return [...getAllFabrics()]
    .filter((item) => item.id !== fabric.id)
    .map((item) => ({
      item,
      score: item.categories.filter((category) =>
        fabric.categories.includes(category),
      ).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}

export const mostUsedFabricIds = [
  'cotton',
  'egyptian-cotton',
  'linen',
  'terry-cloth',
  'percale',
  'sateen',
  'polyester',
  'denim',
  'silk',
  'jacquard',
  'poplin',
  'flannel',
] as const;

export function getFabricsByIds(ids: readonly string[]): LaundryFabric[] {
  const fabricById = new Map(
    getAllFabrics().map((fabric) => [fabric.id, fabric]),
  );
  return ids
    .map((id) => fabricById.get(id))
    .filter((fabric): fabric is LaundryFabric => Boolean(fabric));
}

export function extractWashTemperatureBadge(
  fabric: LaundryFabric,
): string | null {
  const match = fabric.washTemperature.en.match(/(\d+)\s*°?\s*C/i);

  if (!match) {
    return null;
  }

  return `${match[1]}°C`;
}

export type CareSymbolKind =
  | 'machine'
  | 'delicate'
  | 'dryClean'
  | 'handWash'
  | 'wool';

export function getCareSymbolKind(fabric: LaundryFabric): CareSymbolKind {
  const program = fabric.washingProgram.en.toLowerCase();

  if (
    fabric.dryCleaning &&
    (program.includes('dry clean') || program.includes('dry-clean'))
  ) {
    return 'dryClean';
  }

  if (
    program.includes('wool') ||
    fabric.fabricType.en.toLowerCase().includes('wool')
  ) {
    return 'wool';
  }

  if (
    isDelicateFabric(fabric) ||
    program.includes('delicate') ||
    program.includes('silk')
  ) {
    return 'delicate';
  }

  const tempBadge = extractWashTemperatureBadge(fabric);
  const tempValue = tempBadge ? Number.parseInt(tempBadge, 10) : Number.NaN;

  if (!Number.isNaN(tempValue) && tempValue <= 30) {
    return 'handWash';
  }

  return 'machine';
}

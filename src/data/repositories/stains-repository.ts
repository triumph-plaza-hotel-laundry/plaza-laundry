import { laundryStains, type LaundryStain } from '@/data/laundry-stains';
import {
  createCatalogRepository,
  registerRepository,
} from '@/data/repositories/repository-utils';
import { STORAGE_KEYS } from '@/lib/data-store/storage-keys';

export type {
  LaundryStain,
  LocalizedText,
  StainCategory,
  StainDifficulty,
  StainIconKind,
} from '@/data/laundry-stains';
export { localizedText } from '@/data/laundry-stains';

export const stainsRepository = createCatalogRepository<LaundryStain>({
  key: STORAGE_KEYS.stains,
  seed: () => laundryStains,
});

registerRepository(STORAGE_KEYS.stains, stainsRepository.store);

import { laundryFabrics, type LaundryFabric } from '@/data/laundry-fabrics';
import {
  createCatalogRepository,
  registerRepository,
} from '@/data/repositories/repository-utils';
import { STORAGE_KEYS } from '@/lib/data-store/storage-keys';

export type {
  FabricFilterCategory,
  LaundryFabric,
  LocalizedText,
} from '@/data/laundry-fabrics';

export const fabricsRepository = createCatalogRepository<LaundryFabric>({
  key: STORAGE_KEYS.fabrics,
  seed: () => laundryFabrics,
});

registerRepository(STORAGE_KEYS.fabrics, fabricsRepository.store);

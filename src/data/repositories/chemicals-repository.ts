import { createRelationalCatalogStore } from '@/lib/data-store/create-relational-catalog-store';
import {
  createCatalogRepository,
  registerRepository,
} from '@/data/repositories/repository-utils';
import {
  fetchAllChemicals,
  getChemicalsSeed,
  CHEMICALS_REALTIME_TABLES,
  replaceAllChemicals,
} from '@/features/chemicals/chemicals-service';
import { STORAGE_KEYS } from '@/lib/data-store/storage-keys';
import type { LaundryChemical } from '@/data/laundry-chemicals';

export type {
  ChemicalTechnicalRow,
  LaundryChemical,
  LocalizedText,
} from '@/data/laundry-chemicals';
export { localizedText } from '@/data/laundry-chemicals';

const chemicalsStore = createRelationalCatalogStore<LaundryChemical>({
  key: STORAGE_KEYS.chemicals,
  seed: getChemicalsSeed,
  fetchAll: fetchAllChemicals,
  replaceAll: replaceAllChemicals,
  realtimeTables: CHEMICALS_REALTIME_TABLES,
});

export const chemicalsRepository = createCatalogRepository<LaundryChemical>({
  key: STORAGE_KEYS.chemicals,
  seed: getChemicalsSeed,
  store: chemicalsStore,
});

registerRepository(STORAGE_KEYS.chemicals, chemicalsRepository.store);

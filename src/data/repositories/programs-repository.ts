import { createRelationalCatalogStore } from '@/lib/data-store/create-relational-catalog-store';
import {
  createCatalogRepository,
  registerRepository,
} from '@/data/repositories/repository-utils';
import {
  fetchAllPrograms,
  getProgramsSeed,
  PROGRAMS_REALTIME_TABLES,
  replaceAllPrograms,
} from '@/features/programs/programs-service';
import { STORAGE_KEYS } from '@/lib/data-store/storage-keys';
import type { WashingProgram } from '@/data/washing-programs';

export type { WashingProgram } from '@/data/washing-programs';

const programsStore = createRelationalCatalogStore<WashingProgram>({
  key: STORAGE_KEYS.programs,
  seed: getProgramsSeed,
  fetchAll: fetchAllPrograms,
  replaceAll: replaceAllPrograms,
  realtimeTables: PROGRAMS_REALTIME_TABLES,
});

export const programsRepository = createCatalogRepository<WashingProgram>({
  key: STORAGE_KEYS.programs,
  seed: getProgramsSeed,
  store: programsStore,
});

registerRepository(STORAGE_KEYS.programs, programsRepository.store);

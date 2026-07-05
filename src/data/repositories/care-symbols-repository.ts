import { careLabels, type CareLabel } from '@/data/care-symbols';
import { createCatalogRepository, registerRepository } from '@/data/repositories/repository-utils';
import { STORAGE_KEYS } from '@/lib/data-store/storage-keys';

export type {
  CareLabel,
  CareSymbolCategory,
  CareSymbolGraphic,
  LocalizedText,
} from '@/data/care-symbols';
export { localizedText } from '@/data/care-symbols';

export const careSymbolsRepository = createCatalogRepository<CareLabel>({
  key: STORAGE_KEYS.careSymbols,
  seed: () => careLabels,
});

registerRepository(STORAGE_KEYS.careSymbols, careSymbolsRepository.store);

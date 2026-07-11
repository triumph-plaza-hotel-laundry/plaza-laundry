import { useContext } from 'react';
import { InventoryArchiveContext } from '@/features/admin/context/inventory-archive-context';

export function useInventoryArchive() {
  const context = useContext(InventoryArchiveContext);
  if (!context) {
    throw new Error(
      'useInventoryArchive must be used within InventoryArchiveProvider.',
    );
  }
  return context;
}

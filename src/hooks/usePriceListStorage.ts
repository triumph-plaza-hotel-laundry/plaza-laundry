import { useCallback } from 'react';
import {
  priceListRepository,
  type PriceField,
  type PriceListItem,
  type PriceListTab,
} from '@/data/repositories';
import { useAuth } from '@/hooks/useAuth';
import { useSyncStore } from '@/hooks/useSyncStore';

export function usePriceListStorage() {
  const state = useSyncStore(priceListRepository);
  const { assertCan, logAction } = useAuth();

  const updatePrice = useCallback(
    (tab: PriceListTab, itemId: string, field: PriceField, value: string) => {
      assertCan('priceList', 'update');
      const { oldValue, newValue } = priceListRepository.updatePrice(
        tab,
        itemId,
        field,
        value,
      );
      logAction({
        action: 'priceList.update',
        page: 'price-list',
        oldValue,
        newValue,
      });
    },
    [assertCan, logAction],
  );

  const createItem = useCallback(
    (item: PriceListItem) => {
      assertCan('priceList', 'create');
      priceListRepository.createItem(item);
      logAction({
        action: 'priceList.createItem',
        page: 'price-list',
        newValue: item,
      });
    },
    [assertCan, logAction],
  );

  const updateItem = useCallback(
    (id: string, next: PriceListItem) => {
      assertCan('priceList', 'update');
      priceListRepository.updateItem(id, next);
      logAction({
        action: 'priceList.updateItem',
        page: 'price-list',
        newValue: next,
      });
    },
    [assertCan, logAction],
  );

  const deleteItem = useCallback(
    (id: string) => {
      assertCan('priceList', 'delete');
      priceListRepository.removeItem(id);
      logAction({
        action: 'priceList.deleteItem',
        page: 'price-list',
        oldValue: { id },
      });
    },
    [assertCan, logAction],
  );

  return {
    items: state.items,
    prices: state.prices,
    updatePrice,
    createItem,
    updateItem,
    deleteItem,
  };
}

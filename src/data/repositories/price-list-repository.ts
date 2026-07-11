import {
  createDefaultPriceState,
  priceListItems,
  type ItemPrices,
  type PriceField,
  type PriceListCategory,
  type PriceListItem,
  type PriceListTab,
} from '@/data/laundry-price-list';
import { createLocalStore } from '@/lib/data-store';
import { registerRepository } from '@/data/repositories/repository-utils';
import { STORAGE_KEYS } from '@/lib/data-store/storage-keys';

export type {
  ItemPrices,
  PriceField,
  PriceListCategory,
  PriceListItem,
  PriceListTab,
} from '@/data/laundry-price-list';

export type PriceListState = {
  items: PriceListItem[];
  prices: Record<PriceListTab, Record<string, ItemPrices>>;
};

export const priceListCategories: readonly PriceListCategory[] = [
  'mens',
  'womens',
  'bedding',
];

function seedPriceListState(): PriceListState {
  return {
    items: [...priceListItems],
    prices: createDefaultPriceState(),
  };
}

function readLegacyPrices(): Record<
  PriceListTab,
  Record<string, ItemPrices>
> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.priceListLegacy);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<
      Record<PriceListTab, Record<string, ItemPrices>>
    >;
    const defaults = createDefaultPriceState();
    return {
      guest: { ...defaults.guest, ...parsed.guest },
      outsideGuest: { ...defaults.outsideGuest, ...parsed.outsideGuest },
    };
  } catch {
    return null;
  }
}

function normalizePriceList(
  parsed: unknown,
  seed: PriceListState,
): PriceListState {
  if (!parsed || typeof parsed !== 'object') {
    const legacy = readLegacyPrices();
    return legacy ? { ...seed, prices: legacy } : seed;
  }

  const value = parsed as Partial<PriceListState>;

  if (value.items && value.prices) {
    return {
      items: value.items as PriceListItem[],
      prices: {
        guest: { ...seed.prices.guest, ...value.prices.guest },
        outsideGuest: {
          ...seed.prices.outsideGuest,
          ...value.prices.outsideGuest,
        },
      },
    };
  }

  const legacy = value as Partial<
    Record<PriceListTab, Record<string, ItemPrices>>
  >;
  if (legacy.guest || legacy.outsideGuest) {
    return {
      items: seed.items,
      prices: {
        guest: { ...seed.prices.guest, ...legacy.guest },
        outsideGuest: { ...seed.prices.outsideGuest, ...legacy.outsideGuest },
      },
    };
  }

  return seed;
}

const store = createLocalStore<PriceListState>({
  key: STORAGE_KEYS.priceList,
  seed: seedPriceListState,
  normalize: normalizePriceList,
});

registerRepository(STORAGE_KEYS.priceList, store);

export const priceListRepository = {
  getSnapshot: store.getSnapshot,
  subscribe: store.subscribe,
  reloadFromStorage: store.reloadFromStorage,
  get items() {
    return store.getSnapshot().items;
  },
  get prices() {
    return store.getSnapshot().prices;
  },
  getItemsByCategory(category: PriceListCategory) {
    return store
      .getSnapshot()
      .items.filter((entry) => entry.category === category);
  },
  updatePrice(
    tab: PriceListTab,
    itemId: string,
    field: PriceField,
    value: string,
  ) {
    const snapshot = store.getSnapshot();
    const current = snapshot.prices[tab][itemId] ?? {
      wash: '',
      dryClean: '',
      iron: '',
    };
    const oldValue = { tab, itemId, field, value: current[field] };

    store.replaceState({
      ...snapshot,
      prices: {
        ...snapshot.prices,
        [tab]: {
          ...snapshot.prices[tab],
          [itemId]: {
            ...current,
            [field]: value,
          },
        },
      },
    });

    return { oldValue, newValue: { tab, itemId, field, value } };
  },
  createItem(item: PriceListItem) {
    const snapshot = store.getSnapshot();
    if (snapshot.items.some((entry) => entry.id === item.id)) {
      throw new Error('Price list item already exists');
    }

    const empty = { wash: '', dryClean: '', iron: '' };
    store.replaceState({
      items: [...snapshot.items, item],
      prices: {
        guest: { ...snapshot.prices.guest, [item.id]: empty },
        outsideGuest: { ...snapshot.prices.outsideGuest, [item.id]: empty },
      },
    });
  },
  updateItem(id: string, next: PriceListItem) {
    const snapshot = store.getSnapshot();
    store.replaceState({
      ...snapshot,
      items: snapshot.items.map((item) => (item.id === id ? next : item)),
    });
  },
  removeItem(id: string) {
    const snapshot = store.getSnapshot();
    const { [id]: guestRemoved, ...guestPrices } = snapshot.prices.guest;
    const { [id]: outsideRemoved, ...outsidePrices } =
      snapshot.prices.outsideGuest;
    void guestRemoved;
    void outsideRemoved;

    store.replaceState({
      items: snapshot.items.filter((item) => item.id !== id),
      prices: {
        guest: guestPrices,
        outsideGuest: outsidePrices,
      },
    });
  },
  replaceAll(next: PriceListState) {
    store.replaceState(next);
    return store.flush();
  },
  flush: store.flush,
  hydrate: store.hydrate,
};

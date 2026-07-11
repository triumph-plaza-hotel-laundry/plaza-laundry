export type LocalizedText = {
  en: string;
  ar: string;
};

export type PriceListTab = 'guest' | 'outsideGuest';

export type PriceListCategory = 'mens' | 'womens' | 'bedding';

export type PriceField = 'wash' | 'dryClean' | 'iron';

export type ItemPrices = {
  wash: string;
  dryClean: string;
  iron: string;
};

export type PriceListItem = {
  id: string;
  category: PriceListCategory;
  name: LocalizedText;
};

const emptyPrices = (): ItemPrices => ({
  wash: '',
  dryClean: '',
  iron: '',
});

function item(
  id: string,
  category: PriceListCategory,
  en: string,
  ar: string,
): PriceListItem {
  return {
    id,
    category,
    name: { en, ar },
  };
}

export const priceListItems: readonly PriceListItem[] = [
  item('mens-shirt', 'mens', 'Shirt', 'قميص'),
  item('mens-t-shirt', 'mens', 'T-Shirt', 'تيشيرت'),
  item('mens-shorts', 'mens', 'Shorts', 'شورت'),
  item('mens-pants', 'mens', 'Pants', 'بنطلون'),
  item('mens-sweatshirt', 'mens', 'Sweatshirt', 'سويت شيرت'),
  item('mens-pullover', 'mens', 'Pullover', 'بلوفر'),
  item('mens-galabeya', 'mens', 'Galabeya', 'جلابية'),
  item('mens-abaya', 'mens', 'Abaya', 'عباءة'),
  item('mens-pajama', 'mens', 'Pajama', 'بيجاما'),
  item('mens-suit', 'mens', 'Suit', 'بدلة'),
  item('mens-coat', 'mens', 'Coat', 'معطف'),
  item('mens-vest', 'mens', 'Vest', 'صدرية'),
  item('mens-night-shirt', 'mens', 'Night Shirt', 'قميص نوم'),
  item('mens-undershirt', 'mens', 'Undershirt', 'فانلة داخلية'),
  item('mens-underwear', 'mens', 'Underwear', 'ملابس داخلية'),
  item('mens-socks', 'mens', 'Socks', 'جوارب'),
  item('mens-ghutrah', 'mens', 'Ghutrah', 'غترة'),
  item('mens-scarf', 'mens', 'Scarf', 'وشاح'),

  item('womens-blouse', 'womens', 'Blouse', 'بلوزة'),
  item('womens-shirt', 'womens', 'Shirt', 'قميص'),
  item('womens-t-shirt', 'womens', 'T-Shirt', 'تيشيرت'),
  item('womens-shorts', 'womens', 'Shorts', 'شورت'),
  item('womens-pants', 'womens', 'Pants', 'بنطلون'),
  item('womens-sweatshirt', 'womens', 'Sweatshirt', 'سويت شيرت'),
  item('womens-pullover', 'womens', 'Pullover', 'بلوفر'),
  item('womens-abaya', 'womens', 'Abaya', 'عباءة'),
  item('womens-dress', 'womens', 'Dress', 'فستان'),
  item('womens-wedding-dress', 'womens', 'Wedding Dress', 'فستان زفاف'),
  item('womens-evening-dress', 'womens', 'Evening Dress', 'فستان سهرة'),
  item('womens-night-gown', 'womens', 'Night Gown', 'روب نوم'),
  item('womens-bra', 'womens', 'Bra', 'حمالة صدر'),
  item('womens-underwear', 'womens', 'Underwear', 'ملابس داخلية'),
  item('womens-scarf', 'womens', 'Scarf', 'وشاح'),
  item('womens-hijab', 'womens', 'Hijab', 'حجاب'),
  item('womens-socks', 'womens', 'Socks', 'جوارب'),

  item('bedding-bed-sheet', 'bedding', 'Bed Sheet', 'ملاءة سرير'),
  item('bedding-pillow-case', 'bedding', 'Pillow Case', 'كيس وسادة'),
  item('bedding-blanket', 'bedding', 'Blanket', 'بطانية'),
  item('bedding-large-duvet', 'bedding', 'Large Duvet', 'لحاف كبير'),
  item('bedding-small-duvet', 'bedding', 'Small Duvet', 'لحاف صغير'),
  item('bedding-towel', 'bedding', 'Towel', 'منشفة'),
  item('bedding-bath-towel', 'bedding', 'Bath Towel', 'منشفة حمام'),
  item('bedding-curtain', 'bedding', 'Curtain', 'ستارة'),
] as const;

export const priceListCategories: readonly PriceListCategory[] = [
  'mens',
  'womens',
  'bedding',
] as const;

export function getItemsByCategory(
  category: PriceListCategory,
): PriceListItem[] {
  return priceListItems.filter((entry) => entry.category === category);
}

export function createEmptyPriceMap(): Record<string, ItemPrices> {
  return Object.fromEntries(
    priceListItems.map((entry) => [entry.id, emptyPrices()]),
  );
}

export function createDefaultPriceState(): Record<
  PriceListTab,
  Record<string, ItemPrices>
> {
  return {
    guest: createEmptyPriceMap(),
    outsideGuest: createEmptyPriceMap(),
  };
}

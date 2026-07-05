export type InventorySeedItem = {
  code: string;
  name: string;
  stock: number;
};

/**
 * Official inventory seed — preserve order, codes, and names exactly as provided.
 */
export const inventoryItems: InventorySeedItem[] = [
  { code: '5701091', name: 'بدلة رجالي', stock: 0 },
  { code: '5701090', name: 'بدلة حريمي', stock: 0 },
  { code: '5701034 / 5701035', name: 'بنطلون رجالي', stock: 0 },
  { code: '5701036', name: 'بنطلون رجالي أبيض', stock: 0 },
  { code: '5701032', name: 'بنطلون حريمي', stock: 0 },
  { code: '5701087', name: 'جاكيت أمن', stock: 0 },
  { code: '', name: 'جاكيت مخازن', stock: 0 },
  { code: '5701016', name: 'جاكيت مطبخ رجالي', stock: 0 },
  { code: '5701062 / 5701109', name: 'جاكيت مطبخ مساعد شيف', stock: 0 },
  { code: '5701015', name: 'جاكيت مطبخ حريمي', stock: 0 },
  { code: '5701099', name: 'بنطلون حريمي', stock: 0 },
  { code: '5701007', name: 'قميص أبيض', stock: 0 },
  { code: '5701010', name: 'قميص أمن (أزرق)', stock: 0 },
  { code: '5701097', name: 'بلوزة', stock: 0 },
  { code: '5701073 / 5701055', name: 'تيشيرت مغسلة', stock: 0 },
  { code: '5701039', name: 'تيشيرت مغسلة نص كم', stock: 0 },
  { code: '5701061', name: 'تيشيرت استيوارد', stock: 0 },
  { code: '5701095', name: 'طقم مطعم رئيسي', stock: 0 },
  { code: '5701108', name: 'طقم مطعم لبناني', stock: 0 },
  { code: '5701084 / 5701083', name: 'قميص لبناني / بنطلون لبناني', stock: 0 },
  { code: '5701094', name: 'طقم كوفي شوب', stock: 0 },
  { code: '5701098', name: 'طقم روم سيرفيس', stock: 0 },
  { code: '5701101', name: 'طقم استيوارد مشرفين', stock: 0 },
  { code: '5701060', name: 'طقم استيوارد عمال', stock: 0 },
  { code: '5701076', name: 'طقم كافتريا', stock: 0 },
  { code: '5701105', name: 'طقم هاوس مشرف', stock: 0 },
  { code: '5701078', name: 'طقم هاوس عمال رجالي', stock: 0 },
  { code: '5701079', name: 'طقم هاوس عمال حريمي', stock: 0 },
  { code: '5701104', name: 'طقم صيانة مشرفين', stock: 0 },
  { code: '5701038', name: 'طقم صيانة عمال', stock: 0 },
  { code: '5701041', name: 'طقم زراعة', stock: 0 },
  { code: '5701030', name: 'طقم بلمان', stock: 0 },
  { code: '5701110', name: 'طقم أمن صناعي', stock: 0 },
  { code: '5701111', name: 'طقم مخازن', stock: 0 },
  { code: '5701018', name: 'كرافتة', stock: 0 },
  { code: '5701002 / 5701037', name: 'إبرون أسود / أبيض', stock: 0 },
  { code: '5701003', name: 'مريلة استيوارد', stock: 0 },
  { code: '5701096 / 5701013', name: 'جلبية (صديري رجالي / حريمي)', stock: 0 },
  { code: '5701019', name: 'تيبونة', stock: 0 },
  { code: '5701088 / 5701107', name: 'تلبيسة رأس', stock: 0 },
  { code: '5701020 / 5701051', name: 'بلوفر كم', stock: 0 },
];

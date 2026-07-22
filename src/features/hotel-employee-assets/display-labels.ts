/**
 * Display-only Arabic labels for Hotel Employee Assets.
 * Stored English names in the DB are never mutated.
 */

const DEPARTMENT_NAME_AR: Record<string, string> = {
  Directors: 'الإدارة',
  'Front Offices': 'الاستقبال',
  'Front Office': 'الاستقبال',
  'Personnel Affairs': 'الموارد البشرية',
  'Human Resources': 'الموارد البشرية',
  'Information Technology': 'تقنية المعلومات',
  IT: 'تقنية المعلومات',
  'Audio Engineering': 'الهندسة الصوتية',
  Engineering: 'الهندسة',
  Sales: 'المبيعات والتسويق',
  'Sales & Marketing': 'المبيعات والتسويق',
  'Public Relations': 'العلاقات العامة',
  'Drivers & Secretariat': 'السائقون والسكرتارية',
  Accounts: 'الحسابات',
  'Food & Beverage & Banquets': 'الأغذية والمشروبات والحفلات',
  Security: 'الأمن',
  Housekeeping: 'الإشراف الداخلي',
  Kitchen: 'المطبخ',
  Laundry: 'المغسلة',
  Stewarding: 'الاستيوارد',
  Maintenance: 'الصيانة',
  Purchasing: 'المشتريات',
  Gym: 'الجيم',
  Engineering: 'الهندسة',
};

const ITEM_NAME_AR: Record<string, string> = {
  'Black Suit': 'بدلة سوداء',
  'Navy Suit': 'بدلة كحلي',
  'Grey Suit': 'بدلة رمادي',
  "Women's Suit": 'بدلة حريمي',
  'Balman Suit': 'بدلة بلمان',
  'White Shirt': 'قميص أبيض',
  'Beige Shirt': 'قميص لبني',
  'Striped Shirt': 'قميص مقلم',
  'Half Collar Shirt': 'قميص نص ياقة',
  Blouse: 'بلوزة',
  'Navy Tie': 'كرافت كحلي',
  'Black Tie': 'كرافت أسود',
  'Wine Tie': 'كرافت نبيتي',
  'Grey Tie': 'كرافت رمادي',
  'Black Pants': 'بنطلون أسود',
  'Navy Pants': 'بنطلون كحلي',
  'White Pants': 'بنطلون أبيض',
  "Women's Pants": 'بنطلون حريمي',
  'Wine T-Shirt (Long Sleeve)': 'تيشيرت نبيتي كم طويل',
  'Wine T-Shirt (Short Sleeve)': 'تيشيرت نبيتي كم قصير',
  'Navy T-Shirt (Long Sleeve)': 'تيشيرت كحلي كم طويل',
  'Navy T-Shirt (Short Sleeve)': 'تيشيرت كحلي كم قصير',
  'Grey T-Shirt (Long Sleeve)': 'تيشيرت رمادي كم طويل',
  'Grey T-Shirt (Short Sleeve)': 'تيشيرت رمادي كم قصير',
  'Black T-Shirt (Long Sleeve)': 'تيشيرت أسود كم طويل',
  'Black T-Shirt (Short Sleeve)': 'تيشيرت أسود كم قصير',
  'White T-Shirt (Long Sleeve)': 'تيشيرت أبيض كم طويل',
  'White T-Shirt (Short Sleeve)': 'تيشيرت أبيض كم قصير',
  'Cold Room Jacket': 'جاكيت غرفة تبريد',
  'Navy Jacket': 'جاكيت كحلي',
  'Black Jacket': 'جاكيت أسود',
  'White Kitchen Jacket': 'جاكيت مطبخ أبيض',
  'Black Kitchen Jacket': 'جاكيت مطبخ أسود',
  'Grey Kitchen Jacket': 'جاكيت مطبخ رمادي',
  'White Apron': 'مريلة بيضاء',
  'Black Apron': 'مريلة سوداء',
  'Beige Apron': 'مريلة لبني',
  'Tan Apron': 'مريلة بيج',
  "Men's HK Kit": 'طقم إشراف داخلي رجالي',
  "Women's HK Kit": 'طقم إشراف داخلي حريمي',
  'Head Cover': 'غطاء رأس',
  'Black Coat': 'معطف أسود',
  'Navy Coat': 'معطف كحلي',
  "Men's Supervision Kit": 'طقم إشراف رجالي',
  "Women's Supervision Kit": 'طقم إشراف حريمي',
  "Men's Workers Kit": 'طقم عمال رجالي',
  "Women's Workers Kit": 'طقم عمال حريمي',
  'Black Sports Tracksuit': 'تراكسوت رياضي أسود',
  'Navy Sports Tracksuit': 'تراكسوت رياضي كحلي',
  'Grey Sports Tracksuit': 'تراكسوت رياضي رمادي',
  'Black Sports T-Shirt': 'تيشيرت رياضي أسود',
  'White Sports T-Shirt': 'تيشيرت رياضي أبيض',
  'Navy Sports T-Shirt': 'تيشيرت رياضي كحلي',
  'Grey Sports T-Shirt': 'تيشيرت رياضي رمادي',
  'Wine Sports T-Shirt': 'تيشيرت رياضي نبيتي',
  'Black Sports Pants': 'بنطلون رياضي أسود',
  'Navy Sports Pants': 'بنطلون رياضي كحلي',
  'Grey Sports Pants': 'بنطلون رياضي رمادي',
  'Black Sports Shorts': 'شورت رياضي أسود',
  'Navy Sports Shorts': 'شورت رياضي كحلي',
  'Grey Sports Shorts': 'شورت رياضي رمادي',
};

export function displayAssetDepartmentName(
  name: string,
  language: string,
): string {
  if (language !== 'ar') {
    return name;
  }
  return DEPARTMENT_NAME_AR[name] ?? name;
}

export function displayAssetItemName(name: string, language: string): string {
  if (language !== 'ar') {
    return name;
  }
  return ITEM_NAME_AR[name] ?? name;
}

import type { Language } from '@/types/language';

export type LocalizedText = {
  en: string;
  ar: string;
};

export type ChemicalTechnicalRow = {
  key: string;
  label: LocalizedText;
  value: LocalizedText;
};

export type LaundryChemical = {
  id: number;
  productCode: string;
  brand: string;
  name: LocalizedText;
  image: string;
  category: LocalizedText;
  description: LocalizedText;
  howItWorks: LocalizedText;
  features: { en: readonly string[]; ar: readonly string[] };
  usage: LocalizedText;
  dosage: LocalizedText;
  warnings: { en: readonly string[]; ar: readonly string[] };
  safety: LocalizedText;
  storage: LocalizedText;
  technicalInfo: readonly ChemicalTechnicalRow[];
  technicalFooterNote: LocalizedText;
};

export function localizedText(text: LocalizedText, language: Language): string {
  return text[language];
}

const technicalFooterNote: LocalizedText = {
  en: 'Numbers are general indicators for normal production and not an official specification.',
  ar: 'الأرقام مؤشرات عامة للإنتاج العادي وليست مواصفة رسمية.',
};

const seitzTechnicalFooterNote: LocalizedText = {
  en: 'Technical indicators are taken from available product data and may vary by operation and batch.',
  ar: 'المؤشرات الفنية مأخوذة من بيانات المنتج المتاحة، وقد تختلف حسب التشغيل والدفعة.',
};

export const laundryChemicals: readonly LaundryChemical[] = [
  {
    id: 1,
    productCode: '4AL1',
    brand: 'CLAX',
    name: { en: 'Hypo', ar: 'Hypo' },
    image: '/chemicals/product.svg',
    category: { en: 'Chlorine bleach for laundry', ar: 'مبيض كلور للغسيل' },
    description: {
      en: 'Clax Hypo is a chlorine bleach for laundry in large laundries and hospitals. It is added during the rinse cycle at a temperature between 20 and 40 degrees. It is suitable for white laundry and some colored fabrics that tolerate chlorine.',
      ar: 'Clax Hypo هو مبيض كلور للغسيل في المغاسل الكبيرة والمستشفيات. يُضاف في وقت الشطف على حرارة بين 20 و 40 درجة. يصلح للغسيل الأبيض وبعض الملونات التي تتحمل الكلور.',
    },
    howItWorks: {
      en: 'It contains chlorine and alkalis that assist in bleaching at low temperatures. A thin liquid that is easy to pump. Suitable for white laundry and items that tolerate chlorine, such as operating room covers.',
      ar: 'يحتوي على كلور وقلويات تساعد على التبييض على حرارة منخفضة. سائل رقيق سهل الضخ. يصلح للغسيل الأبيض وللقطع التي تتحمل الكلور مثل أغطية غرف العمليات.',
    },
    features: {
      en: [
        'Excellent bleach for all white laundry',
        'Easy to dose',
        'Preserves laundry if used correctly',
        'Bleaches at low temperatures = electricity savings',
        'Achieves excellent cleanliness for laundry',
      ],
      ar: [
        'مبيض ممتاز لجميع الغسيل الأبيض',
        'سهل الجرعة',
        'يحافظ على الغسيل إذا استخدم بشكل صحيح',
        'يبيض على حرارة منخفضة = توفير في الكهرباء',
        'يحقق نظافة ممتازة للغسيل',
      ],
    },
    usage: {
      en: 'Dosage varies based on the type of laundry.',
      ar: 'تختلف الجرعة حسب نوع الغسيل.',
    },
    dosage: {
      en: 'Appropriate dosage: 6 - 15 ml / kg of dry laundry.',
      ar: 'الجرعة المناسبة: 6 - 15 مل / كجم غسيل جاف.',
    },
    warnings: {
      en: [
        'Best result and least damage: water temperature around 28 degrees, and pH around 9.5.',
        'If the pH level drops below 9.5, the chlorine becomes stronger and damages the laundry.',
        'If the pH level is high, the temperature can be raised — at pH 10.5, the temperature remains 50-55 degrees.',
        'Chlorine with chlorhexidine causes brown stains that are difficult to remove.',
        'After bleaching, excess chlorine must be neutralized in the last rinse (Clax Cid).',
        'Do not use Hypo on nylon (such as HTN mats).',
      ],
      ar: [
        'أحسن نتيجة وأقل ضرر: حرارة الماء حوالي 28 درجة، وال pH حوالي 9.5.',
        'إذا انخفض الرقم الهيدروجيني (pH) عن 9.5 يصبح الكلور أقوى ويتلف الغسيل.',
        'إذا كان الرقم الهيدروجيني (pH) مرتفعاً، يمكن رفع درجة الحرارة — عند pH 10.5 الحرارة تبقى 50-55 درجة.',
        'الكلور مع الكلورهيكسيدين يسبب بقعاً بنية يصعب إزالتها.',
        'بعد التبييض يجب تحييد الكلور الزائد في آخر شطفة (Clax Cid).',
        'لا تستخدم Hypo على النايلون (زي حصائر HTN).',
      ],
    },
    safety: {
      en: 'Wear chemical-resistant gloves and eye protection. Avoid contact with skin and eyes. Do not mix with incompatible products.',
      ar: 'ارتدِ قفازات مقاومة للمواد الكيميائية وواقي العيون. تجنب ملامسة الجلد والعينين. لا تخلط مع منتجات غير متوافقة.',
    },
    storage: {
      en: 'Store in the original closed container away from extreme heat. Need more information? Refer to the Safety Data Sheet (SDS).',
      ar: 'يُحفظ في العبوة الأصلية مغلقة بعيداً عن الحرارة الشديدة. محتاج معلومات أكثر؟ راجع ورقة بيانات السلامة (SDS).',
    },
    technicalInfo: [
      {
        key: 'form',
        label: { en: 'Appearance', ar: 'الشكل' },
        value: { en: 'Clear yellow liquid', ar: 'سائل أصفر شفاف' },
      },
      {
        key: 'ph',
        label: { en: 'pH (1% solution)', ar: 'ال pH (محلول 1%)' },
        value: { en: '12', ar: '12' },
      },
      {
        key: 'density',
        label: { en: 'Density at 20°C', ar: 'الكثافة (20°م)' },
        value: { en: '1.175', ar: '1.175' },
      },
      {
        key: 'chlorine',
        label: { en: 'Available Chlorine (%)', ar: 'الكلور المتاح (%)' },
        value: { en: '14', ar: '14' },
      },
    ],
    technicalFooterNote,
  },
  {
    id: 2,
    productCode: '5DL2',
    brand: 'CLAX',
    name: { en: 'Soft Extra', ar: 'Soft Extra' },
    image: '/chemicals/product.svg',
    category: { en: 'Concentrated fabric softener', ar: 'منعم أقمشة مركز' },
    description: {
      en: 'Clax Soft Extra concentrated fabric softener for large and in-house laundries. Suitable for most types of laundry and can be added manually or by machine.',
      ar: 'Clax Soft Extra منعم أقمشة مركز للمغاسل الكبيرة والداخلية. يصلح لمعظم أنواع الغسيل ويُضاف يدوي أو بالماكينة.',
    },
    howItWorks: {
      en: 'It adheres to fabric fibers, making them soft and comfortable. During drying, it prevents fiber entanglement and static electricity buildup. Especially suitable for heavy items like towels.',
      ar: 'يلتصق بخيوط القماش فيجعله ناعماً ومريحاً. في التجفيف يمنع تشابك الخيوط وتراكم الكهرباء الساكنة. يصلح بصفة خاصة للقطع الثقيلة مثل المناشف.',
    },
    features: {
      en: [
        'Softens many types (towels, sheets, wool, etc.)',
        'Prevents static electricity in synthetic fabrics',
        'Gives a fragrant scent that stays on the laundry',
        'Biodegradable and eco-friendly ingredients',
      ],
      ar: [
        'ينعم أنواعاً كثيرة (مناشف، شراشف، صوف وغيرها)',
        'يمنع الكهرباء الساكنة في الأقمشة الصناعية',
        'يمنح رائحة عطرة تبقى على الغسيل',
        'مكوناته قابلة للتحلل وصديقة للبيئة',
      ],
    },
    usage: {
      en: 'Added in the last rinse of the washing machine or in the final section of a continuous batch washer.',
      ar: 'يُضاف في آخر شطفة في الغسالة أو في آخر قسم في ماكينة الغسيل المستمرة.',
    },
    dosage: {
      en: 'Dosage: 1.5 - 5.0 ml / kg dry laundry.',
      ar: 'الجرعة: 1.5 - 5.0 مل / كجم غسيل جاف.',
    },
    warnings: {
      en: [
        'Do not use on cleanroom garments (micro-polyester).',
        'Do not use on water-repellent treated laundry or microfiber cleaning cloths.',
      ],
      ar: [
        'لا تستخدمه على ملابس الغرف النظيفة (مصنوعة من بوليستر دقيق).',
        'لا تستخدمه على الغسيل المعالج بمادة طاردة للماء أو مناديل التنظيف الدقيقة.',
      ],
    },
    safety: {
      en: 'Slippery when spilled — clean floors immediately. Avoid eye contact.',
      ar: 'زلق عند الانسكاب — نظّف الأرضيات فوراً. تجنب ملامسة العينين.',
    },
    storage: {
      en: 'Store in the original closed container away from extreme heat. Need more information? Refer to the Safety Data Sheet (SDS).',
      ar: 'يُحفظ في العبوة الأصلية مغلقة بعيداً عن الحرارة الشديدة. محتاج معلومات أكثر؟ راجع ورقة بيانات السلامة (SDS).',
    },
    technicalInfo: [
      {
        key: 'form',
        label: { en: 'Appearance', ar: 'الشكل' },
        value: { en: 'Thin blue liquid', ar: 'سائل أزرق رقيق' },
      },
      {
        key: 'ph',
        label: { en: 'pH (pure)', ar: 'الـ pH (نقي)' },
        value: { en: '3.5 - 4.5', ar: '3.5 - 4.5' },
      },
      {
        key: 'density',
        label: { en: 'Density at 20°C', ar: 'الكثافة عند 20°م' },
        value: { en: '0.994', ar: '0.994' },
      },
      {
        key: 'viscosity',
        label: { en: 'Viscosity (25° / mPa.s)', ar: 'اللزوجة (25° / mPa.s)' },
        value: { en: '—', ar: '—' },
      },
    ],
    technicalFooterNote,
  },
  {
    id: 3,
    productCode: '12A1',
    brand: 'CLAX',
    name: { en: 'Build Lite', ar: 'Build Lite' },
    image: '/chemicals/product.svg',
    category: {
      en: 'Alkali builder and water softener',
      ar: 'منشط قلوي وملين مياه',
    },
    description: {
      en: 'Clax Build Lite is a liquid alkaline builder that softens water. It contains alkalis and mineral-sequestering agents. Suitable for areas with medium or low water hardness.',
      ar: 'Clax Build Lite منشط قلوي سائل يلين المياه. يحتوي على قلويات ومواد تمسك الأملاح المعدنية. يصلح للمناطق التي تحتوي على مياه متوسطة أو قليلة العسر.',
    },
    howItWorks: {
      en: 'Reduces water hardness and prevents detergent deposition on laundry. When combined with bleach, it achieves powerful cleaning in hospitals and care homes.',
      ar: 'يقلل صلابة المياه ويمنع ترسيب المنظفات على الغسيل. إذا دمج مع المبيض يحقق نظافة قوية في المستشفيات ودور الرعاية.',
    },
    features: {
      en: [
        'Improves removal of dirt, food stains, and fats',
        'Prevents graying of laundry and holds dirt in the water',
        'Prevents yellowing of laundry',
        'Improves fiber performance in the wash',
      ],
      ar: [
        'يحسن إزالة الأوساخ وبقع الطعام والدهون',
        'يمنع رمادية الغسيل ويحجز الأوساخ في الماء',
        'يمنع اصفرار الغسيل',
        'يحسن أداء الألياف في الغسلة',
      ],
    },
    usage: {
      en: 'Dosage varies according to the type of laundry. Light soil: 3-5 ml/kg; Medium: 6-10 ml/kg; Heavy: 10-15 ml/kg.',
      ar: 'تختلف الجرعة حسب نوع الغسيل. خفيفة: 3-5 مل/كجم؛ متوسطة: 6-10 مل/كجم؛ شديدة: 10-15 مل/كجم.',
    },
    dosage: {
      en: 'Fat removal is best at 60-70°C. In food factories, rinsing must be with potable water for any item that contacts food.',
      ar: 'إزالة الدهون تكون أفضل على درجة حرارة 60-70 درجة. في مصانع الأغذية، الشطف لازم يكون بمياه صالحة للشرب لأي قطعة تلامس الطعام.',
    },
    warnings: {
      en: [
        'In food factories, rinsing must be with potable water for any item that contacts food.',
      ],
      ar: [
        'في مصانع الأغذية، الشطف لازم يكون بمياه صالحة للشرب لأي قطعة تلامس الطعام.',
      ],
    },
    safety: {
      en: 'Corrosive — causes serious eye damage. Full PPE mandatory. Never mix with acids.',
      ar: 'مادة آكلة — تسبب ضرراً جسيماً للعينين. معدات الوقاية الشخصية الكاملة إلزامية. لا تخلط أبداً مع الأحماض.',
    },
    storage: {
      en: 'Store in the original closed container away from extreme heat and food storage areas. Refer to the Safety Data Sheet (SDS).',
      ar: 'يُحفظ في العبوة الأصلية مغلقة بعيد عن الحرارة الشديدة وبعيد عن أماكن تخزين الأكل. راجع ورقة بيانات السلامة (SDS).',
    },
    technicalInfo: [
      {
        key: 'form',
        label: { en: 'Appearance', ar: 'الشكل' },
        value: { en: 'Clear amber liquid', ar: 'سائل كهرماني شفاف' },
      },
      {
        key: 'alkalinity',
        label: {
          en: 'Total Alkalinity (% Na2O)',
          ar: 'القلوية الكلية (% Na2O)',
        },
        value: { en: '13.5', ar: '13.5' },
      },
      {
        key: 'ph',
        label: { en: 'pH (pure)', ar: 'الـ pH (نقي)' },
        value: { en: '13.5', ar: '13.5' },
      },
      {
        key: 'density',
        label: { en: 'Density (20°C)', ar: 'الكثافة (20°م)' },
        value: { en: '1.25', ar: '1.25' },
      },
    ],
    technicalFooterNote,
  },
  {
    id: 4,
    productCode: '40B1',
    brand: 'CLAX',
    name: { en: 'Sonril Ultra', ar: 'Sonril Ultra' },
    image: '/chemicals/product.svg',
    category: {
      en: 'High-temperature oxygen bleach',
      ar: 'مبيض أكسجين للحرارة العالية',
    },
    description: {
      en: 'Clax Sonril Ultra is a concentrated stain remover for large laundries and hospitals. Suitable for all types of laundry (except nylon) and is added in the main wash at a temperature between 70 and 90 degrees.',
      ar: 'Clax Sonril Ultra مزيل بقع مركز للمغاسل الكبيرة والمستشفيات. يصلح لجميع أنواع الغسيل (ما عدا النايلون) ويُضاف في الغسلة الرئيسية على حرارة بين 70 و90 درجة.',
    },
    howItWorks: {
      en: 'A stable and effective oxygen bleach (hydrogen peroxide). A thin liquid that is easy to pump. Suitable for all types of laundry, including colored. Note: Blood stains set with peroxide — treat blood-contaminated laundry with an enzymatic product first.',
      ar: 'مبيض بالأكسجين (بيروكسيد هيدروجين) ثابت وفعال. سائل رقيق سهل الضخ. يصلح لجميع أنواع الغسيل حتى الملون. تنبيه: بقع الدم تثبت مع البيروكسيد — عالج الغسيل الملوث بالدم بمنتج إنزيمي أولاً.',
    },
    features: {
      en: [
        'Excellent stain remover for all types of laundry, even colored',
        'Easy to dose',
        'Maintains the laundry if used correctly',
      ],
      ar: [
        'مزيل بقع ممتاز لجميع أنواع الغسيل حتى الملون',
        'سهل الجرعة',
        'يحافظ على الغسيل إذا استخدم بشكل صحيح',
      ],
    },
    usage: {
      en: 'Added in the main wash compartment at 70-90°C.',
      ar: 'يُضاف في الغسلة الرئيسية على حرارة بين 70 و90 درجة.',
    },
    dosage: {
      en: 'Appropriate dose: 1.7 - 3.4 ml / kg dry laundry.',
      ar: 'الجرعة المناسبة: 1.7 - 3.4 مل / كجم غسيل جاف.',
    },
    warnings: {
      en: [
        'Best used above 80 degrees, with wash pH between 9 and 10.7.',
        'High heat with pH above 10.7 can damage natural fibers.',
        'For bleaching at 60-80 degrees: pH should be 11 - 11.5.',
        'Below 60 degrees: Bleaching remains weak.',
        'Do not use on nylon (like HTN mats).',
      ],
      ar: [
        'استخدمه بشكل أفضل فوق 80 درجة، وال pH في الغسلة بين 9 و 10.7.',
        'حرارة عالية مع pH فوق 10.7 ممكن يتلف الألياف الطبيعية.',
        'للتبييض على 60-80 درجة: pH يكون 11 - 11.5.',
        'تحت 60 درجة: التبييض يبقى ضعيف.',
        'لا تستخدم على النايلون (زي حصائر HTN).',
      ],
    },
    safety: {
      en: 'Irritant to eyes and skin. Use PPE. Do not combine with incompatible products.',
      ar: 'مهيّج للعينين والجلد. استخدم معدات الوقاية الشخصية. لا تخلط مع منتجات غير متوافقة.',
    },
    storage: {
      en: 'Store in the original closed container away from extreme heat. Refer to the Safety Data Sheet (SDS).',
      ar: 'يُحفظ في العبوة الأصلية مغلقة بعيد عن الحرارة الشديدة. راجع ورقة بيانات السلامة (SDS).',
    },
    technicalInfo: [
      {
        key: 'form',
        label: { en: 'Appearance', ar: 'الشكل' },
        value: { en: 'Clear colorless liquid', ar: 'سائل شفاف عديم اللون' },
      },
      {
        key: 'oxygen',
        label: { en: 'Available Oxygen', ar: 'الأكسجين المتاح' },
        value: { en: '—', ar: '—' },
      },
      {
        key: 'density',
        label: { en: 'Density at 20°C', ar: 'الكثافة عند 20°م' },
        value: { en: '1.13', ar: '1.13' },
      },
    ],
    technicalFooterNote,
  },
  {
    id: 5,
    productCode: '60',
    brand: 'CLAX',
    name: { en: 'Neutrapur', ar: 'Neutrapur' },
    image: '/chemicals/product.svg',
    category: {
      en: 'Laundry acidity neutralizer (Sour)',
      ar: 'محايد حموضة للغسيل',
    },
    description: {
      en: 'Clax Neutrapur neutralizes excess alkalinity remaining on the laundry after washing. It is added in the final rinse of any wash program.',
      ar: 'Clax Neutrapur يحيد القلوية الزائدة التي تتبقى على الغسيل بعد الغسلة. يُضاف في آخر شطفة في أي برنامج غسيل.',
    },
    howItWorks: {
      en: 'It relies on a strong organic acid that reacts with any excess alkalinity on the laundry. It leaves no unpleasant odor on the fabric after use. Compatible with all Diversey products and all types of laundry.',
      ar: 'يعتمد على حمض عضوي قوي يتفاعل مع أي قلوية زيادة على الغسيل. ولا يترك أي رائحة غير مستحبة على القماش بعد الاستخدام. يصلح مع جميع منتجات دايفرسي وجميع أنواع الغسيل.',
    },
    features: {
      en: [
        'Effective organic acid',
        'Leaves no odor on the laundry',
        'Suitable for all types of laundry',
      ],
      ar: [
        'حمض عضوي فعال',
        'لا يترك رائحة على الغسيل',
        'يصلح مع جميع أنواع الغسيل',
      ],
    },
    usage: {
      en: 'Added in the final rinse using a standard dosing machine. Required pH in laundry at end: approximately 6.5.',
      ar: 'يُضاف في آخر شطفة بماكينة الجرعات العادية. نسبة الحموضة (pH) المطلوبة في الغسيل في النهاية: حوالي 6.5.',
    },
    dosage: {
      en: 'Dosage: 1.5 - 4 ml / kg dry laundry.',
      ar: 'الجرعة المناسبة: 1.5 - 4 مل / كجم غسيل جاف.',
    },
    warnings: { en: [], ar: [] },
    safety: {
      en: 'Acidic — causes eye and skin irritation. Use PPE. Never mix with chlorine or hypochlorite products.',
      ar: 'حمضي — يسبب تهيج العينين والجلد. استخدم معدات الوقاية الشخصية. لا تخلط أبداً مع الكلور أو منتجات الهيبوكلوريت.',
    },
    storage: {
      en: 'Keep in the original closed container away from extreme heat. Refer to the Safety Data Sheet (SDS).',
      ar: 'يُحفظ في العبوة الأصلية مغلقة بعيد عن الحرارة الشديدة. راجع ورقة بيانات السلامة (SDS).',
    },
    technicalInfo: [
      {
        key: 'form',
        label: { en: 'Appearance', ar: 'الشكل' },
        value: { en: 'Clear colorless liquid', ar: 'سائل شفاف عديم اللون' },
      },
      {
        key: 'ph',
        label: { en: 'pH (pure)', ar: 'الـ pH (نقي)' },
        value: { en: 'Less than 1', ar: 'أقل من 1' },
      },
      {
        key: 'density',
        label: { en: 'Density', ar: 'الكثافة' },
        value: { en: '1.05 g/ml', ar: '1.05 جم/مل' },
      },
      {
        key: 'odor',
        label: { en: 'Odor', ar: 'الرائحة' },
        value: { en: 'Pungent acidic', ar: 'حمضية نفاذة' },
      },
    ],
    technicalFooterNote,
  },
  {
    id: 6,
    productCode: '63A',
    brand: 'CLAX',
    name: { en: 'Neutra 3in1', ar: 'Neutra 3in1' },
    image: '/chemicals/product.svg',
    category: {
      en: 'Alkali neutralizer + Chlorine neutralizer + Rust remover',
      ar: 'محيد قلوية + محيد كلور + مزيل صدأ',
    },
    description: {
      en: 'Clax Neutra 3in1 is an acidic liquid that works in the final rinse and is not a softener. Its primary function is to protect the fabric after washing: it neutralizes alkaline residues, stops the effect of chlorine, and binds with iron/light rust that may cause yellowing or faint orange spots.',
      ar: 'Clax Neutra 3in1 سائل حمضي يعمل في آخر شطفة، وليس منعماً؛ وظيفته الأساسية حماية القماش بعد الغسيل: يعادل بقايا القلوية، يوقف أثر الكلور، ويرتبط بالحديد/الصدأ الخفيف الذي قد يسبب اصفرار أو بقع برتقالية باهتة.',
    },
    howItWorks: {
      en: 'Washing starts with strong alkalis and detergents, and sometimes chlorine. If these residues remain in the fabric, they will cause yellowing, chlorine odor, allergies, and weakening of the threads. Neutra 3in1 lowers the pH to a safe level, neutralizes residual chlorine, and helps prevent the deposition of iron present in the water or light rust traces.',
      ar: 'الغسيل يبدأ بقلويات ومنظفات قوية، وأحياناً كلور. إذا تبقت هذه البقايا في القماش ستسبب اصفراراً، ورائحة كلور، وحساسية، وضعفاً في الخيوط. Neutra 3in1 يخفض الرقم الهيدروجيني (pH) إلى مستوى آمن، يحيد الكلور المتبقي، ويساعد على منع ترسيب الحديد الموجود في المياه أو آثار الصدأ الخفيفة.',
    },
    features: {
      en: [
        'Neutralizes residual alkalinity after the main wash',
        'Neutralizes residual chlorine and reduces chlorine odor',
        'Helps prevent yellowing of whites due to iron in the water',
        'Preserves the life of sheets and towels when used at an accurate dose',
        'Brings the fabric to a pH close to safe for the skin',
      ],
      ar: [
        'يعادل القلوية المتبقية بعد الغسلة الرئيسية',
        'يحيد الكلور المتبقي ويقلل رائحة الكلور',
        'يساعد في منع اصفرار الأبيض بسبب الحديد في المياه',
        'يحافظ على عمر الملاءات والمناشف لما يستخدم بجرعة دقيقة',
        'يوصل القماش في النهاية لـ pH قريب من الآمن على الجلد',
      ],
    },
    usage: {
      en: 'What is it for: Last rinse after programs with strong alkaline detergents; white laundry or towels exposed to chlorine; water with iron content or light yellowing problems; hotel linens needing final pH around 6-6.5. Added in the last rinse after the main wash.',
      ar: 'يصلح لإيه؟ آخر شطفة بعد برامج فيها منظفات قلوية قوية؛ الغسيل الأبيض أو المناشف التي تعرضت لكلور؛ المياه اللي فيها نسبة حديد أو مشاكل اصفرار خفيف؛ البياضات الفندقية اللي تحتاج إلى pH نهائي حوالي 6 - 6.5. يُضاف في آخر شطفة بعد انتهاء الغسلة الرئيسية.',
    },
    dosage: {
      en: 'Goal: final laundry pH approximately 6-6.5, or per washing program instructions.',
      ar: 'الهدف هو أن يكون الرقم الهيدروجيني (pH) للغسيل في النهاية بين 6 و 6.5 تقريباً، أو طبقاً لتعليمات برنامج الغسيل.',
    },
    warnings: {
      en: [
        'Excessive dosage increases acidity and may weaken the fabric or cause a pungent odor.',
        'Do not store in metal containers and do not pump through iron hoses because it is acidic and may affect the metal.',
        'Use a pH test after the last rinse if available to adjust the injection pump.',
      ],
      ar: [
        'الزيادة في الجرعة تزيد الحمضية وقد تضعف القماش أو تسبب رائحة لاذعة.',
        'لا يُخزن في أواني معدنية ولا يُضخ بخراطيم حديد لأنه حمضي وقد يؤثر على المعدن.',
        'استخدم اختبار pH بعد آخر شطفة لو متاح لضبط طلمبة الحقن.',
      ],
    },
    safety: {
      en: 'Acidic product — use PPE. Do not mix directly with alkalis or bleach outside the dosing system.',
      ar: 'منتج حمضي — استخدم معدات الوقاية الشخصية. لا تخلطه مباشرة مع القلويات أو المبيض خارج نظام الجرعات.',
    },
    storage: {
      en: 'Keep in the original closed container away from extreme heat. Do not mix directly with other chemicals outside the dosing system. Refer to SDS.',
      ar: 'تُحفظ في العبوة الأصلية مغلقة بعيداً عن الحرارة الشديدة. لا تخلطه مباشرة مع مواد كيميائية أخرى خارج نظام الجرعات. راجع ورقة بيانات السلامة (SDS).',
    },
    technicalInfo: [
      {
        key: 'form',
        label: { en: 'Appearance', ar: 'الشكل' },
        value: { en: 'Clear liquid', ar: 'سائل شفاف' },
      },
      {
        key: 'ph',
        label: { en: 'pH (1% solution)', ar: 'الـ pH (محلول 1%)' },
        value: { en: '—', ar: '—' },
      },
      {
        key: 'density',
        label: { en: 'Density', ar: 'الكثافة' },
        value: { en: '1.10 - 1.14', ar: '1.10 - 1.14' },
      },
      {
        key: 'functions',
        label: { en: 'Functions', ar: 'الوظائف' },
        value: { en: 'pH control', ar: 'pH control' },
      },
    ],
    technicalFooterNote,
  },
  {
    id: 7,
    productCode: '24A1',
    brand: 'CLAX',
    name: { en: '200', ar: 'Clax 200' },
    image: '/chemicals/product.svg',
    category: {
      en: 'Concentrated laundry booster and degreaser',
      ar: 'معزز غسيل ومكسر دهون مركز',
    },
    description: {
      en: 'Clax 200 from Diversey is a concentrated laundry booster and grease emulsifier. Its primary role is to work alongside the main detergent in the main wash to break down stubborn oils and greases from fabrics.',
      ar: 'Clax 200 من دايفرسي هو معزز غسيل مركز ومستحلب للدهون. دوره الأساسي إنه يشتغل جنب المنظف الأساسي في الغسلة الرئيسية لتفكيك الزيوت والشحوم المستعصية من القماش.',
    },
    howItWorks: {
      en: 'It relies on non-ionic surfactants that trap fats and oils, separating them from fibers and keeping them suspended in the wash water instead of re-attaching to the fabric. Very useful for kitchen stains, spa oils, grease, and restaurant linens.',
      ar: 'يعتمد على مواد سطحية غير أيونية تمسك الدهون والزيوت، تفصلها من الألياف، وتخليها متعلقة في مياه الغسيل بدلاً من أن تلتصق بالقماش مجدداً. لذلك مفيد جداً مع بقع المطبخ، زيوت السبا، الشحوم وبياضات المطاعم.',
    },
    features: {
      en: [
        'Powerful on fat, oil, and grease stains',
        'Supports the main detergent and enhances main wash performance',
        'Helps prevent fabric graying due to soil redeposition',
        'Suitable for industrial washing machines as it is low-foaming',
        'Effective at medium and high temperatures depending on soil type',
      ],
      ar: [
        'قوي على بقع الدهون والزيوت والشحوم',
        'يدعم المنظف الأساسي ويعزز أداء الغسلة الرئيسية',
        'يساعد في منع رمادية القماش بسبب رجوع الأوساخ',
        'مناسب للغسالات الصناعية لأنه قليل الرغوة',
        'مفيد مع درجات حرارة متوسطة وعالية حسب نوع الاتساخ',
      ],
    },
    usage: {
      en: 'Best uses: kitchen uniforms/chef clothes; spa/massage oil towels; restaurant linens/greasy tablecloths; heavy white or mixed laundry. Added during main wash with main detergent, not in final rinse.',
      ar: 'أفضل استخدامات: زي المطبخ وملابس الشيف؛ مناشف السبا أو الزيوت؛ مفارش المطاعم والمفارش الدهنية؛ غسيل أبيض ثقيل أو مختلط. يُضاف في الغسلة الرئيسية مع المنظف الأساسي، وليس في آخر شطفة.',
    },
    dosage: {
      en: 'Light: 0.5-2.0 ml/kg; Medium: 2.0-5.0 ml/kg; Heavy/high grease: 3.0-6.0 ml/kg. For heavy grease, performance improves at 40-70°C depending on fabric and program.',
      ar: 'خفيفة: 0.5-2.0 مل/كجم؛ متوسطة: 2.0-5.0 مل/كجم؛ شديدة/دهون عالية: 3.0-6.0 مل/كجم. للدهون الشديدة، الأداء يتحسن عادة على 40-70 درجة حسب نوع القماش والبرنامج.',
    },
    warnings: { en: [], ar: [] },
    safety: {
      en: 'Wear gloves and eye protection. Avoid prolonged skin contact.',
      ar: 'ارتدِ القفازات وواقي العيون. تجنب ملامسة الجلد لفترات طويلة.',
    },
    storage: {
      en: 'Store in original closed container away from extreme heat. Do not mix outside the dosing system except per supplier instructions. Refer to SDS.',
      ar: 'يُحفظ في العبوة الأصلية مغلقة بعيد عن الحرارة الشديدة. لا تخلط خارج نظام الجرعات إلا حسب تعليمات المورد. راجع ورقة بيانات السلامة (SDS).',
    },
    technicalInfo: [
      {
        key: 'form',
        label: { en: 'Appearance', ar: 'الشكل' },
        value: { en: 'Clear colorless liquid', ar: 'سائل شفاف عديم اللون' },
      },
      {
        key: 'ph',
        label: { en: 'pH (1% solution)', ar: 'pH (1% solution)' },
        value: { en: '7.0', ar: '7.0' },
      },
      {
        key: 'density',
        label: { en: 'Density at 20°C', ar: 'الكثافة (20°م)' },
        value: { en: '0.97', ar: '0.97' },
      },
      {
        key: 'viscosity',
        label: { en: 'Viscosity at 25°C', ar: 'اللزوجة (25°م)' },
        value: { en: '1 Pa.s', ar: '1 Pa.s' },
      },
    ],
    technicalFooterNote: {
      en: 'Figures are general production indicators, not final specifications. Adjust dosages based on wash program, fabric type, and water conditions.',
      ar: 'الأرقام مؤشرات عامة لإنتاج العادي وليست مواصفة رسمية. اضبط الجرعات حسب برنامج الغسيل، نوع القماش، وحالة المياه.',
    },
  },
  {
    id: 8,
    productCode: '22B1',
    brand: 'CLAX',
    name: { en: 'Color 100', ar: 'Clax 100 Color' },
    image: '/chemicals/product.svg',
    category: {
      en: 'Safe main detergent for colored laundry',
      ar: 'منظف أساسي آمن للغسيل الملون',
    },
    description: {
      en: 'Clax 100 Color from Diversey is a liquid main wash detergent for colored and light laundry. Cleans general dirt like sweat, dust, and light food stains without bleaches that cause color fading.',
      ar: 'Clax 100 Color من دايفرسي منظف أساسي سائل للغسلة الرئيسية، مخصص للغسيل الملون والفاتح. ينظف الأوساخ العامة زي العرق والتراب وبقع الطعام الخفيفة دون مبيضات تؤدي إلى بهتان اللون.',
    },
    howItWorks: {
      en: 'Cleans fabric with color-safe detergents and keeps soil and weak dyes suspended in the wash water to prevent redeposition. For high-grease colored loads, can be boosted with Clax 200 in the same wash cycle.',
      ar: 'ينظف القماش بمواد منظفة مناسبة للألوان، ويساعد على إبقاء الأوساخ والصبغات الضعيفة في مياه الغسيل بدل الكيماويات من أن تلتصق بالقماش مجدداً. لو الغسيل الملون فيه دهون عالية، يمكن دعمه بـ Clax 200 في نفس الغسلة حسب البرنامج.',
    },
    features: {
      en: [
        'Main detergent for colored laundry, not just an additive',
        'Color-safe (no bleaches)',
        'Suitable for dark uniforms, pool towels, and colored linens',
        'Helps reduce color fading when following dosage and temperature guidelines',
        'Works well at medium temperatures for moderate soil',
      ],
      ar: [
        'منظف أساسي للغسيل الملون، وليس مجرد إضافة',
        'آمن على الألوان لأنه بدون مبيضات',
        'مناسب للزي موحد الغامق، مناشف حمام السباحة، والمفارش الملونة',
        'يساعد في تقليل بهتان اللون عند الالتزام بالجرعة والحرارة',
        'يعمل بشكل جيد في درجات حرارة متوسطة عندما لا يكون الاتساخ شديداً',
      ],
    },
    usage: {
      en: 'Used in main wash; for high grease add Clax 200 as booster.',
      ar: 'يُستخدم في الغسلة الرئيسية، مع الدهون العالية يمكن إضافة Clax 200 كمعزز.',
    },
    dosage: {
      en: 'Light: 1.5-3.0 ml/kg; Medium: 3.0-6.0 ml/kg; Heavy: 5.0-12.0 ml/kg.',
      ar: 'خفيفة: 1.5-3.0 مل/كجم؛ متوسطة: 3.0-6.0 مل/كجم؛ شديدة: 5.0-12.0 مل/كجم.',
    },
    warnings: {
      en: [
        'To preserve colors, avoid unnecessary high heat and chlorine on colored fabrics.',
      ],
      ar: [
        'للحفاظ على الألوان، تجنب الحرارة العالية غير الضرورية والكلور على الأقمشة الملونة.',
      ],
    },
    safety: {
      en: 'Wear gloves and eye protection when handling concentrate.',
      ar: 'ارتدِ القفازات وواقي العيون عند التعامل مع المركز.',
    },
    storage: {
      en: 'Store in original closed container away from extreme heat. Test colorfastness for new or sensitive colors. Refer to SDS.',
      ar: 'يُحفظ في العبوة الأصلية مغلقة بعيد عن الحرارة الشديدة. اختبر ثبات اللون عند الغسيل الجديد أو الألوان الحساسة. راجع ورقة بيانات السلامة (SDS).',
    },
    technicalInfo: [
      {
        key: 'form',
        label: { en: 'Appearance', ar: 'الشكل' },
        value: { en: 'Clear colorless liquid', ar: 'سائل شفاف عديم اللون' },
      },
      {
        key: 'ph',
        label: { en: 'pH (pure)', ar: 'الـ pH (نقي)' },
        value: { en: '7 - 8', ar: '7 - 8' },
      },
      {
        key: 'density',
        label: { en: 'Density (20°C)', ar: 'الكثافة (20°م)' },
        value: { en: '0.98', ar: '0.98' },
      },
      {
        key: 'bleach',
        label: { en: 'Bleach', ar: 'المبيضات' },
        value: { en: 'None', ar: 'بدون' },
      },
    ],
    technicalFooterNote: {
      en: 'Figures are general indicators and not official specifications. Adjust dosages based on wash program, fabric type, and water condition.',
      ar: 'الأرقام مؤشرات عامة لإنتاج العادي وليست مواصفة رسمية. اضبط الجرعات حسب برنامج الغسيل، نوع القماش، وحالة المياه.',
    },
  },
  {
    id: 9,
    productCode: '9065',
    brand: 'SEITZ',
    name: { en: 'Seitz V1', ar: 'Seitz V1' },
    image: '/chemicals/product.svg',
    category: {
      en: 'Specialized stain remover for industrial and professional use',
      ar: 'مزيل بقع متخصص للاستخدامات الصناعية والمهنية',
    },
    description: {
      en: 'Seitz V1 is a specialized stain remover for industrial and professional uses in the field of textile cleaning.',
      ar: 'Seitz V1 مزيل بقع متخصص للاستخدامات الصناعية والمهنية في مجال تنظيف المنسوجات.',
    },
    howItWorks: {
      en: 'Dissolves paint, lacquer, adhesives, ballpoint pen ink, tar, nail polish, lipstick, ink, and grease-related stains.',
      ar: 'إذابة بقع الطلاء واللكيه والمواد اللاصقة والحبر الجاف والزفت وطلاء الأظافر وأحمر الشفاه والحبر والبقع المرتبطة بالدهون.',
    },
    features: {
      en: [
        'Specialized stain remover for textile cleaning in industrial and professional use',
        'Used directly on the stain',
        'Can be supported with a soft brush when needed',
        'The piece is rinsed or washed after treatment',
      ],
      ar: [
        'مزيل بقع متخصص لتنظيف المنسوجات في الاستخدامات الصناعية والمهنية',
        'يُستخدم مباشرة على البقعة',
        'يمكن دعمه بفرشاة ناعمة عند الحاجة',
        'تُشطف أو تُغسل القطعة بعد المعالجة',
      ],
    },
    usage: {
      en: 'Apply V1 to the stain and treat with a soft brush. For old/tough stains, leave longer while repeatedly re-wetting. Before cleaning rinse in dry cleaning machine; on spotting table rinse with water or steam.',
      ar: 'يوضع V1 على البقعة ويُعالج بفرشاة ناعمة. في حالة البقع القديمة أو الصعبة يُترك لفترة أطول مع إعادة ترطيب منطقة البقعة بشكل متكرر. عند الاستخدام قبل التنظيف يُشطف في ماكينة التنظيف الجاف، وعلى طاولة إزالة البقع يُشطف بالماء أو البخار.',
    },
    dosage: {
      en: 'Suitable for: grease/oil, tar, ballpoint ink, lipstick, nail polish, adhesive residue, paint/lacquer stains.',
      ar: 'يصلح لـ: بقع الدهون والزيوت، الزفت، الحبر الجاف، أحمر الشفاه، طلاء الأظافر، بقايا المواد اللاصقة، بقع الطلاء واللكيه.',
    },
    warnings: { en: [], ar: [] },
    safety: {
      en: 'Test color fastness on a hidden part of the fabric before use. Rinse or wash the piece after treatment.',
      ar: 'اختبر ثبات اللون على جزء مخفي من القماش قبل الاستخدام. اشطف أو اغسل القطعة بعد المعالجة.',
    },
    storage: {
      en: 'Store in original closed container away from heat and ignition sources. Refer to SDS.',
      ar: 'يُحفظ في العبوة الأصلية مغلقة بعيداً عن الحرارة ومصادر الاشتعال. راجع ورقة بيانات السلامة (SDS).',
    },
    technicalInfo: [
      {
        key: 'form',
        label: { en: 'Form', ar: 'الشكل' },
        value: { en: 'Homogeneous liquid', ar: 'سائل متجانس' },
      },
      {
        key: 'color',
        label: { en: 'Color', ar: 'اللون' },
        value: { en: 'Colorless', ar: 'عديم اللون' },
      },
      {
        key: 'ph',
        label: { en: 'pH', ar: 'الـ pH' },
        value: { en: '6.0 - 8.0', ar: '6.0 - 8.0' },
      },
      {
        key: 'density',
        label: { en: 'Density', ar: 'الكثافة' },
        value: { en: '1.100 g/L', ar: '1.100 g/L' },
      },
      {
        key: 'flash',
        label: { en: 'Flash point', ar: 'نقطة الوميض' },
        value: { en: '32 °C', ar: '32 °C' },
      },
    ],
    technicalFooterNote: seitzTechnicalFooterNote,
  },
  {
    id: 10,
    productCode: '9066',
    brand: 'SEITZ',
    name: { en: 'Seitz V2', ar: 'Seitz V2' },
    image: '/chemicals/product.svg',
    category: {
      en: 'Specialized stain remover for protein stains',
      ar: 'مزيل بقع متخصص للبقع البروتينية',
    },
    description: {
      en: 'Seitz V2 is a specialized stain remover for protein stains.',
      ar: 'Seitz V2 مزيل بقع متخصص للبقع البروتينية.',
    },
    howItWorks: {
      en: 'Dissolving stains of blood, albumin, food residue, dairy products, ice cream, cream, beer, chocolate, cocoa, sweat, pigment dirt, urine, and similar protein stains.',
      ar: 'إذابة بقع الدم والزلال وبقايا الطعام ومنتجات الألبان والآيس كريم والكريمة والبيرة والشوكولاتة والكاكاو والعرق والأوساخ الصبغية والبول والبقع البروتينية المشابهة.',
    },
    features: {
      en: [
        'Specialized stain remover for protein stains',
        'Used as a pre-wash cleaning agent',
        'Can be used before or after washing as needed',
        'For old stains, leave for a longer period with light moistening',
      ],
      ar: [
        'مزيل بقع متخصص للبقع البروتينية',
        'يُستخدم كعامل تنظيف أولي قبل الغسيل',
        'يمكن استخدامه قبل الغسيل أو بعد الغسيل حسب الحاجة',
        'للبقع القديمة يترك لفترة أطول مع ترطيب خفيف',
      ],
    },
    usage: {
      en: 'Apply directly to stain. For old stains leave longer with light moistening. Rinse well after treatment.',
      ar: 'ضع المادة مباشرة على البقعة. للبقع القديمة يترك لفترة أطول مع ترطيب خفيف. اشطف جيداً بعد المعالجة.',
    },
    dosage: {
      en: 'Suitable for blood, albumin, food residue, dairy, ice cream, cream, beer, chocolate, cocoa, sweat, pigment dirt, urine, and similar protein stains.',
      ar: 'يصلح لبقع الدم والزلال وبقايا الطعام ومنتجات الألبان والآيس كريم والكريمة والبيرة والشوكولاتة والكاكاو والعرق والأوساخ الصبغية والبول والبقع البروتينية المشابهة.',
    },
    warnings: {
      en: ['Test the product on an inconspicuous part before use.'],
      ar: ['اختبر المنتج على جزء غير ظاهر قبل الاستخدام.'],
    },
    safety: {
      en: 'Test the product on an inconspicuous part before use. Rinse well after treatment.',
      ar: 'اختبر المنتج على جزء غير ظاهر قبل الاستخدام. اشطف جيداً بعد المعالجة.',
    },
    storage: {
      en: 'Store in original closed container away from extreme heat. Refer to SDS.',
      ar: 'يُحفظ في العبوة الأصلية مغلقة بعيداً عن الحرارة الشديدة. راجع ورقة بيانات السلامة (SDS).',
    },
    technicalInfo: [
      {
        key: 'form',
        label: { en: 'Form', ar: 'الشكل' },
        value: { en: 'Homogeneous liquid', ar: 'سائل متجانس' },
      },
      {
        key: 'ph',
        label: { en: 'pH', ar: 'ال pH' },
        value: { en: '1.1 - 2.6 (100 g/l)', ar: '1.1 - 2.6 (100 g/l)' },
      },
      {
        key: 'density',
        label: { en: 'Density', ar: 'الكثافة' },
        value: { en: '~1.025 g/ml (20°C)', ar: '~1.025 g/ml (20°C)' },
      },
    ],
    technicalFooterNote: seitzTechnicalFooterNote,
  },
  {
    id: 11,
    productCode: '9067',
    brand: 'SEITZ',
    name: { en: 'Seitz V3', ar: 'Seitz V3' },
    image: '/chemicals/product.svg',
    category: {
      en: 'Specialized stain removal agent for tannin stains and dyeing agents',
      ar: 'عامل إزالة بقع متخصص لبقع التانينات وعوامل الصباغة',
    },
    description: {
      en: 'Seitz V3 is a specialized stain removal agent for tannin stains and dyeing agents.',
      ar: 'Seitz V3 عامل إزالة بقع متخصص لبقع التانينات وعوامل الصباغة.',
    },
    howItWorks: {
      en: 'Dissolves stains from coffee, tea, wine, cola, fruit, fruit juices, alcoholic beverages, tobacco, grass, perfumes, medicines, and similar tannin-related stains.',
      ar: 'إذابة بقع القهوة والشاي والنبيذ والكولا والفواكه وعصائر الفاكهة والمشروبات الكحولية والتبغ والعشب والعطور والأدوية والبقع المشابهة المرتبطة بالتانينات.',
    },
    features: {
      en: [
        'Specialized stain removal agent for tannin stains',
        'Specialized stain removal agent for dyeing agents',
        'Contains Benzenesulfonic acid',
        'Contains surfactants at an approximate rate of 15% - 30%',
      ],
      ar: [
        'عامل إزالة بقع متخصص لبقع التانينات',
        'عامل إزالة بقع متخصص لعوامل الصباغة',
        'يحتوي على Benzenesulfonic acid',
        'يحتوي على مواد خافضة للتوتر السطحي بنسبة تقريبية 15% - 30%',
      ],
    },
    usage: {
      en: 'Apply V3 to the stain and treat with a soft brush. For old or difficult stains, leave for a longer period while repeatedly re-moistening the stain area to increase dissolving power. When used before cleaning, rinse in the machine; on a stain removal table, rinse with water or steam.',
      ar: 'يوضع V3 على البقعة ويُعالج بفرشاة ناعمة. في حالة البقع القديمة أو الصعبة يُترك لفترة أطول مع إعادة ترطيب منطقة البقعة بشكل متكرر لزيادة قوة الإذابة. عند الاستخدام قبل التنظيف يُشطف في الماكينة، وعلى طاولة إزالة البقع يُشطف بالماء أو البخار.',
    },
    dosage: {
      en: 'Suitable for: coffee, tea, soft drinks, cola, fruit juices, fruits, tobacco, grass, alcoholic beverages, perfumes, medicines.',
      ar: 'يصلح لـ: القهوة، الشاي، المشروبات الغازية، الكولا، عصائر الفاكهة، الفواكه، التبغ، العشب، المشروبات الكحولية، العطور، الأدوية.',
    },
    warnings: {
      en: [
        'Causes skin irritation and serious eye damage.',
        'Protective gloves and goggles must be worn.',
        'In case of eye contact, rinse with water for several minutes.',
      ],
      ar: [
        'يسبب تهيج الجلد وأضراراً جسيمة للعين.',
        'يجب ارتداء قفازات ونظارات واقية.',
        'في حالة ملامسة العين تُغسل بالماء لعدة دقائق.',
      ],
    },
    safety: {
      en: 'Causes skin irritation and serious eye damage. Wear protective gloves and goggles. In case of eye contact, rinse with water for several minutes.',
      ar: 'يسبب تهيج الجلد وأضراراً جسيمة للعين. يجب ارتداء قفازات ونظارات واقية. في حالة ملامسة العين تُغسل بالماء لعدة دقائق.',
    },
    storage: {
      en: 'Store in original closed container away from extreme heat. Refer to SDS.',
      ar: 'يُحفظ في العبوة الأصلية مغلقة بعيداً عن الحرارة الشديدة. راجع ورقة بيانات السلامة (SDS).',
    },
    technicalInfo: [
      {
        key: 'form',
        label: { en: 'Form', ar: 'الشكل' },
        value: { en: 'Homogeneous liquid', ar: 'سائل متجانس' },
      },
      {
        key: 'color',
        label: { en: 'Color', ar: 'اللون' },
        value: { en: '—', ar: '—' },
      },
      {
        key: 'ph',
        label: { en: 'pH', ar: 'الـ pH' },
        value: { en: '1.1 - 2.6 (100 g/l)', ar: '1.1 - 2.6 (100 g/l)' },
      },
      {
        key: 'density',
        label: { en: 'Density', ar: 'الكثافة' },
        value: { en: '1.04 g/cm³', ar: '1.04 g/cm³' },
      },
      {
        key: 'flash',
        label: { en: 'Flash point', ar: 'نقطة الوميض' },
        value: { en: 'Not applicable', ar: 'غير منطبق' },
      },
      {
        key: 'ingredients',
        label: { en: 'Ingredients', ar: 'المكونات' },
        value: {
          en: 'Benzenesulfonic acid, surfactants',
          ar: 'Benzenesulfonic acid, مواد خافضة للتوتر السطحي',
        },
      },
    ],
    technicalFooterNote: seitzTechnicalFooterNote,
  },
] as const;

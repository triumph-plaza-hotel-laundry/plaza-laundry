import type { Language } from '@/types/language';

export type LocalizedText = { en: string; ar: string };
export type CareSymbolCategory =
  | 'washing'
  | 'bleaching'
  | 'drying'
  | 'ironing'
  | 'dryCleaning';
export type CareSymbolGraphic =
  | 'machine-wash'
  | 'hand-wash'
  | 'do-not-wash'
  | 'wash-cold'
  | 'wash-warm'
  | 'wash-hot'
  | 'gentle-cycle'
  | 'delicate-cycle'
  | 'bleach-allowed'
  | 'bleach-non-chlorine'
  | 'do-not-bleach'
  | 'tumble-dry'
  | 'tumble-low'
  | 'tumble-medium'
  | 'tumble-high'
  | 'hang-dry'
  | 'flat-dry'
  | 'drip-dry'
  | 'do-not-tumble'
  | 'iron-low'
  | 'iron-medium'
  | 'iron-high'
  | 'steam-iron'
  | 'do-not-iron'
  | 'dry-clean'
  | 'dry-clean-professional'
  | 'petroleum-solvent'
  | 'do-not-dry-clean';

export type CareLabel = {
  id: string;
  name: LocalizedText;
  graphic: CareSymbolGraphic;
  category: CareSymbolCategory;
  meaning: LocalizedText;
  instructions: LocalizedText;
  recommendedFabrics: LocalizedText;
  warnings: LocalizedText;
  hotelNotes: LocalizedText;
};

export function localizedText(text: LocalizedText, language: Language): string {
  return text[language];
}

function c(
  id: string,
  graphic: CareSymbolGraphic,
  category: CareSymbolCategory,
  name: readonly [string, string],
  meaning: readonly [string, string],
  instructions: readonly [string, string],
  recommendedFabrics: readonly [string, string],
  warnings: readonly [string, string],
  hotelNotes: readonly [string, string],
): CareLabel {
  return {
    id,
    name: { en: name[0], ar: name[1] },
    graphic,
    category,
    meaning: { en: meaning[0], ar: meaning[1] },
    instructions: { en: instructions[0], ar: instructions[1] },
    recommendedFabrics: {
      en: recommendedFabrics[0],
      ar: recommendedFabrics[1],
    },
    warnings: { en: warnings[0], ar: warnings[1] },
    hotelNotes: { en: hotelNotes[0], ar: hotelNotes[1] },
  };
}

export const careLabels: readonly CareLabel[] = [
  c(
    'machine-wash',
    'machine-wash',
    'washing',
    ['Machine Wash', 'غسيل آلي'],
    [
      'The garment may be washed in a commercial or domestic washing machine using the temperature and cycle indicated on the label.',
      'يمكن غسل القطعة في غسالة تجارية أو منزلية وفق درجة الحرارة والبرنامج المحددين على البطاقة.',
    ],
    [
      '1. Sort by colour, soil level, and fabric weight before loading.\n2. Select the Triumph Plaza Hotel program matching the care label temperature.\n3. Use Premium Main Wash Detergent at the dosage chart for load size.\n4. Avoid overloading — fill drum to 80% capacity maximum.\n5. Remove promptly after cycle completion to prevent creasing.',
      '1. فرّز حسب اللون ومستوى الاتساخ ووزن القماش قبل التحميل.\n2. اختر برنامج فندق تريومف بلازا المطابق لدرجة حرارة بطاقة العناية.\n3. استخدم منظف الغسيل الرئيسي الفاخر وفق جدول الجرعة لحجم الحمولة.\n4. تجنب الإفراط في التحميل — املأ الأسطوانة بحد أقصى 80%.\n5. أخرج القطعة فور انتهاء الدورة لمنع التجعد.',
    ],
    [
      'Cotton bedsheets, polycotton uniforms, terry towels, table napkins, chef jackets',
      'ملاءات قطنية، زي موحد من قطن مختلط، مناشف تيري، مناديل مائدة، سترات طهاة',
    ],
    [
      'Check for loose buttons or trim before machine washing guest garments.\nNever mix chlorine bleach loads with coloured hotel linen.',
      'افحص الأزرار أو الزخارف المفكوكة قبل الغسيل الآلي لملابس الضيوف.\nلا تخلط حمولات مبيض الكلور مع بياضات الفندق الملونة.',
    ],
    [
      'Default symbol for 70% of Triumph Plaza bulk linen.\nRoute to Tunnel Washer Line 1 for sheets and Line 2 for towels.',
      'الرمز الافتراضي لـ 70% من بياضات فندق تريومف بلازا بالجملة.\nوجّه لخط الغسالة النفقية 1 للملاءات والخط 2 للمناشف.',
    ],
  ),

  c(
    'hand-wash',
    'hand-wash',
    'washing',
    ['Hand Wash', 'غسيل يدوي'],
    [
      'The garment requires gentle washing by hand in lukewarm water without mechanical agitation.',
      'يتطلب القطعة غسلاً يدوياً لطيفاً في ماء فاتر دون تحريك ميكانيكي.',
    ],
    [
      '1. Fill a clean basin with lukewarm water at 30°C maximum.\n2. Dissolve Delicate Fabric Wash at half the standard dosage.\n3. Submerge garment; gently squeeze — never wring or twist.\n4. Rinse in fresh cool water until detergent is fully removed.\n5. Roll in a clean towel to extract moisture; lay flat or hang to dry.',
      '1. املأ حوضاً نظيفاً بماء فاتر بحد أقصى 30°م.\n2. ذوّب منظف الأقمشة الحساسة بنصف الجرعة القياسية.\n3. اغمر القطعة؛ اضغط بلطف — لا تعصر أو تلف أبداً.\n4. اشطف بماء بارد نظيف حتى إزالة المنظف بالكامل.\n5. لفّ في منشفة نظيفة لامتصاص الرطوبة؛ جفّف مسطحاً أو معلقاً.',
    ],
    [
      'Silk scarves, lace overlays, beaded evening wear, cashmere throws, designer guest garments',
      'أوشحة حرير، تطريز دانتيل، ملابس سهرة مرصعة، أغطية كشمير، ملابس ضيوف مصممة',
    ],
    [
      'Hand-wash only in the designated VIP garment bay — never in main wash sinks.\nDocument guest name and room number on every hand-wash tag.',
      'الغسيل اليدوي فقط في منطقة ملابس كبار الشخصيات المخصصة — لا في أحواض الغسيل الرئيسية.\nسجّل اسم الضيف ورقم الغرفة على كل بطاقة غسيل يدوي.',
    ],
    [
      'Train concierge to flag hand-wash items at collection.\nStock Delicate Fabric Wash at executive floor pantries.',
      'درب الكونسيرج على تمييز قطع الغسيل اليدوي عند الاستلام.\nخزّن منظف الأقمشة الحساسة في مخازن الطابق التنفيذي.',
    ],
  ),

  c(
    'do-not-wash',
    'do-not-wash',
    'washing',
    ['Do Not Wash', 'لا تغسل'],
    [
      'The garment must not be washed with water. Any aqueous cleaning will cause irreversible damage to fibres, dyes, or structure.',
      'يجب عدم غسل القطعة بالماء. أي تنظيف مائي سيسبب ضرراً لا رجعة فيه للألياف أو الأصباغ أو البنية.',
    ],
    [
      '1. Do not place in any washing machine or hand-wash basin.\n2. Inspect for surface soil; brush lightly with a soft garment brush only.\n3. Route immediately to approved dry-clean vendor with care label photo.\n4. Attach Do Not Wash tag and segregate in quarantine rack.\n5. Notify guest services before processing if item is guest-owned.',
      '1. لا تضع في أي غسالة أو حوض غسيل يدوي.\n2. افحص الاتساخ السطحي؛ فرش بلطف بفرشاة ملابس ناعمة فقط.\n3. وجّه فوراً لمزود التنظيف الجاف المعتمد مع صورة بطاقة العناية.\n4. أرفق بطاقة لا تغسل وافصل في رف الحجر الصحي.\n5. أبلغ خدمة الضيوف قبل المعالجة إن كانت القطعة ملكاً للضيف.',
    ],
    [
      'Structured wool blazers, leather-trimmed coats, fur accessories, bonded laminates, some performance wear',
      'سترات صوف منظمة، معاطف بحواف جلد، إكسسوارات فرو، طبقات ملصقة، بعض ملابس الأداء',
    ],
    [
      'Water contact causes shrinkage, dye bleeding, and adhesive failure.\nNever attempt spot-cleaning with water on Do Not Wash labels.',
      'ملامسة الماء تسبب انكماشاً ونزيف ألوان وفشل لاصق.\nلا تحاول إزالة البقع بالماء على بطاقات لا تغسل أبداً.',
    ],
    [
      'Quarantine rack is mandatory at Triumph Plaza laundry intake.\nSLA: return to guest within 48 hours via contracted dry-clean partner.',
      'رف الحجر الصحي إلزامي عند استلام غسيل تريومف بلازا.\nاتفاقية مستوى الخدمة: إرجاع للضيف خلال 48 ساعة عبر شريك التنظيف الجاف.',
    ],
  ),

  c(
    'wash-cold',
    'wash-cold',
    'washing',
    ['Wash Cold (30°C)', 'غسيل بارد (30°م)'],
    [
      'The garment should be washed at a maximum temperature of 30°C to preserve colour, elasticity, and delicate fibres.',
      'يجب غسل القطعة بدرجة حرارة لا تتجاوز 30°م للحفاظ على اللون والمرونة والألياف الحساسة.',
    ],
    [
      '1. Set tunnel washer or washer-extractor to 30°C cold program.\n2. Use Colour-Safe Detergent — no alkali boosters.\n3. Pre-treat stains with cold Enzyme Prespot only.\n4. Select short or delicate cycle with reduced mechanical action.\n5. Cold rinse twice to remove all surfactant residue.',
      '1. اضبط الغسالة النفقية أو المستخرجة على برنامج بارد 30°م.\n2. استخدم منظفاً آمناً للألوان — دون معززات قلوية.\n3. عالج البقع بمُزيل إنزيمي بارد فقط.\n4. اختر دورة قصيرة أو حساسة بتحريك ميكانيكي مخفّض.\n5. اشطف بارد مرتين لإزالة بقايا المنظّف السطحي.',
    ],
    [
      'Dark-coloured uniforms, navy concierge suits, printed resort wear, elastane blends, guest activewear',
      'زي موحد داكن، بدلات كونسيرج كحلية، ملابس منتجع مطبوعة، خلطات إيلاستان، ملابس رياضية للضيوف',
    ],
    [
      'Hot water causes dye migration on dark hotel uniforms.\nProtein stains (blood, egg) require cold pre-treatment before any warm step.',
      'الماء الساخن يسبب انتقال ألوان على الزي الموحد الداكن.\nبقع البروتين (دم، بيض) تتطلب معالجة باردة قبل أي خطوة دافئة.',
    ],
    [
      'Default for all dark uniform loads at Triumph Plaza.\nProgram code: COLD-30 on washer touch panels.',
      'الافتراضي لجميع حمولات الزي الداكن في تريومف بلازا.\nرمز البرنامج: COLD-30 على لوحات الغسالة.',
    ],
  ),

  c(
    'wash-warm',
    'wash-warm',
    'washing',
    ['Wash Warm (40°C)', 'غسيل دافئ (40°م)'],
    [
      'The garment may be washed at 40°C — the standard temperature for everyday cotton and blended hotel textiles.',
      'يمكن غسل القطعة عند 40°م — درجة الحرارة القياسية للقطن اليومي والمنسوجات الفندقية المختلطة.',
    ],
    [
      '1. Load sorted whites and light colours together at 40°C.\n2. Dose Premium Main Wash Detergent per soil classification chart.\n3. Add Oxygen Bleach to white loads only at approved concentration.\n4. Run full wash cycle with intermediate rinse.\n5. Extract at high spin only if fabric care label permits.',
      '1. حمّل الأبيض والألوان الفاتحة المفرزة معاً عند 40°م.\n2. جرّع منظف الغسيل الرئيسي الفاخر وفق جدول تصنيف التربة.\n3. أضف مبيض الأكسجين لحمولات الأبيض فقط بالتركيز المعتمد.\n4. شغّل دورة غسيل كاملة مع شطف وسيط.\n5. استخرج بدوران عالٍ فقط إن سمحت بطاقة العناية.',
    ],
    [
      'Polycotton pillowcases, housekeeping uniforms, spa robes, light-coloured table linen',
      'أكياس وسائد من قطن مختلط، زي التدبير المنزلي، أردية سبا، مفارش مائدة فاتحة',
    ],
    [
      'Do not exceed 40°C on garments with elastane content above 5%.\nSeparate heavily soiled chef coats — pre-soak before warm wash.',
      'لا تتجاوز 40°م على الملابس التي تحتوي أكثر من 5% إيلاستان.\nافصل معاطف الطهاة شديدة الاتساخ — انقع قبل الغسيل الدافئ.',
    ],
    [
      'Most common wash temperature across Triumph Plaza floors.\nAligns with Fine Cotton and Hotel Linen standard programs.',
      'أكثر درجة حرارة غسيل شيوعاً في طوابق تريومف بلازا.\nيتوافق مع برامج قطن فاخر وبياضات فندقية القياسية.',
    ],
  ),

  c(
    'wash-hot',
    'wash-hot',
    'washing',
    ['Wash Hot (60°C+)', 'غسيل ساخن (60°م+)'],
    [
      'The garment may be washed at 60°C or higher for hygienic processing of white cotton and heavily soiled institutional linen.',
      'يمكن غسل القطعة عند 60°م أو أعلى للمعالجة الصحية للقطن الأبيض وبياضات المؤسسات شديدة الاتساخ.',
    ],
    [
      '1. Restrict to white 100% cotton or institutional polycotton only.\n2. Set tunnel washer to 60°C or 75°C Hygienic program.\n3. Dose Premium Main Wash Detergent plus Alkali Booster for heavy soil.\n4. Add Oxygen Bleach or approved chlorine for disinfection per HACCP protocol.\n5. Verify thermal disinfection log — hold 60°C for minimum 10 minutes.',
      '1. قيّد على القطن الأبيض 100% أو قطن مختلط مؤسسي فقط.\n2. اضبط الغسالة النفقية على برنامج صحي 60°م أو 75°م.\n3. جرّع منظف الغسيل الرئيسي الفاخر مع معزز قلوي للتربة الثقيلة.\n4. أضف مبيض أكسجين أو كلور معتمد للتعقيم وفق بروتوكول HACCP.\n5. تحقق من سجل التعقيم الحراري — حافظ على 60°م لمدة 10 دقائق كحد أدنى.',
    ],
    [
      'White bedsheets, bath towels, kitchen cloths, medical-grade linen, post-event banquet napkins',
      'ملاءات بيضاء، مناشف حمام، أقمشة مطبخ، بياضات طبية، مناديل حفلات بعد الفعاليات',
    ],
    [
      'Never use 60°C+ on coloured, wool, silk, or synthetic garments.\nThermal damage to elastane is irreversible above 60°C.',
      'لا تستخدم 60°م+ على الملون أو الصوف أو الحرير أو التركيبيات.\nالضرر الحراري للإيلاستان لا رجعة فيه فوق 60°م.',
    ],
    [
      'Mandatory for banquet post-event linen reset at Triumph Plaza.\nHACCP thermal log required daily — Laundry Manager sign-off.',
      'إلزامي لإعادة ضبط بياضات الحفلات بعد الفعاليات في تريومف بلازا.\nسجل حراري HACCP يومي — توقيع مدير الغسيل.',
    ],
  ),

  c(
    'gentle-cycle',
    'gentle-cycle',
    'washing',
    ['Gentle Cycle', 'دورة لطيفة'],
    [
      'The garment requires a reduced-agitation wash cycle with slower drum speed and shorter wash time.',
      'يتطلب القطعة دورة غسيل بتحريك مخفّض وسرعة أسطوانة أبطأ ووقت غسيل أقصر.',
    ],
    [
      '1. Select Gentle or Easy Care program on washer-extractor.\n2. Reduce load to 50% drum capacity for adequate water cushion.\n3. Use Delicate Fabric Wash at standard dosage.\n4. Disable extra rinse spin — use low spin speed 400 RPM maximum.\n5. Place items in mesh laundry bags for embellished uniforms.',
      '1. اختر برنامج لطيف أو عناية سهلة على المستخرجة.\n2. قلّل الحمولة إلى 50% من سعة الأسطوانة لوسادة مائية كافية.\n3. استخدم منظف الأقمشة الحساسة بالجرعة القياسية.\n4. عطّل دوران الشطف الإضافي — سرعة دوران منخفضة 400 دورة/دقيقة كحد أقصى.\n5. ضع القطع في أكياس غسيل شبكية للزي المزخرف.',
    ],
    [
      'Embroidered front-desk blazers, sequined banquet sashes, viscose blouses, modal spa wraps',
      'سترات استقبال مطرزة، أشرطة حفلات مرصعة، بلوزات فيسكوز، أغطية سبا من مودال',
    ],
    [
      'Gentle cycle does not compensate for wrong temperature — always match heat to label.\nSnagging risk increases with zippered items — close all zippers and use mesh bags.',
      'الدورة اللطيفة لا تعوّض درجة الحرارة الخاطئة — طابق الحرارة دائماً مع البطاقة.\nخطر التشابك يزداد مع القطع ذات السحّاب — أغلق السحّابات واستخدم أكياس شبكية.',
    ],
    [
      'Program code: GENTLE on all guest-garment washer-extractors.\nFront desk staff trained to request gentle cycle at intake.',
      'رمز البرنامج: GENTLE على جميع مستخرجات ملابس الضيوف.\nموظفو الاستقبال مدربون على طلب الدورة اللطيفة عند الاستلام.',
    ],
  ),

  c(
    'delicate-cycle',
    'delicate-cycle',
    'washing',
    ['Delicate Cycle', 'دورة حساسة'],
    [
      'The garment requires the most minimal mechanical action — typically for fragile knits, lace, and luxury fibres.',
      'يتطلب القطعة أقل تحريك ميكانيكي ممكن — عادة للحياكات الهشة والدانتيل والألياف الفاخرة.',
    ],
    [
      '1. Use dedicated Delicate & Silk program only — never standard cycles.\n2. Maximum load: 2 kg or three guest garments per cycle.\n3. Wash at 30°C with Delicate Fabric Wash — no bleach additives.\n4. Enable extra water fill for cushioning; disable pre-wash agitation.\n5. Air-dry or flat-dry only — do not tumble dry unless separately permitted.',
      '1. استخدم برنامج حساس وحرير المخصص فقط — لا الدورات القياسية.\n2. الحمولة القصوى: 2 كغ أو ثلاث قطع ضيوف لكل دورة.\n3. اغسل عند 30°م بمنظف الأقمشة الحساسة — دون إضافات مبيض.\n4. فعّل ملء ماء إضافي للتوسيد؛ عطّل تحريك ما قبل الغسيل.\n5. جفّف بالهواء أو مسطحاً فقط — لا تجفف بالمجفف إلا إن سُمح بذلك منفصلاً.',
    ],
    [
      'Cashmere sweaters, silk pillowcases, lace curtains, fine knit guest loungewear',
      'سترات كشمير، أكياس وسائد حرير، ستائر دانتيل، ملابس استرخاء ضيوف حياكة ناعمة',
    ],
    [
      'Delicate cycle in a commercial machine still carries risk — escalate to hand-wash for couture items.\nNever combine delicates with terry towels in the same load.',
      'الدورة الحساسة في آلة تجارية لا تزال محفوفة بالمخاطر — صعّد للغسيل اليدوي لقطع الكوتور.\nلا تخلط الحساس مع مناشف تيري في نفس الحمولة.',
    ],
    [
      'Dedicated washer-extractor #4 in VIP bay — Delicate & Silk program locked.\nRequires senior laundry attendant authorization for each cycle.',
      'مستخرجة مخصصة #4 في منطقة كبار الشخصيات — برنامج حساس وحرير مقفل.\nيتطلب تفويض مساعد غسيل أول لكل دورة.',
    ],
  ),

  c(
    'bleach-allowed',
    'bleach-allowed',
    'bleaching',
    ['Bleach Allowed', 'المبيض مسموح'],
    [
      'Chlorine or oxygen bleach may be used on this garment to whiten, disinfect, or remove stubborn stains.',
      'يمكن استخدام مبيض الكلور أو الأكسجين على هذه القطعة للتبييض أو التعقيم أو إزالة البقع العنيدة.',
    ],
    [
      '1. Confirm fabric is 100% white cotton or approved white polycotton.\n2. For chlorine: dose per chart — maximum 150 ppm active chlorine.\n3. For oxygen bleach: add at main wash stage at 40–60°C.\n4. Never pour undiluted bleach directly onto fabric.\n5. Rinse thoroughly — residual bleach damages fibres and causes yellowing over time.',
      '1. تأكد أن القماش قطن أبيض 100% أو قطن مختلط أبيض معتمد.\n2. للكلور: جرّع وفق الجدول — 150 جزء في المليون كلور نشط كحد أقصى.\n3. لمبيض الأكسجين: أضف عند مرحلة الغسيل الرئيسي عند 40–60°م.\n4. لا تسكب المبيض غير المخفف مباشرة على القماش.\n5. اشطف جيداً — بقايا المبيض تتلف الألياف وتسبب اصفراراً مع الوقت.',
    ],
    [
      'White cotton bedsheets, white bath towels, white tablecloths, chef whites, kitchen aprons',
      'ملاءات قطنية بيضاء، مناشف حمام بيضاء، مفارش مائدة بيضاء، بياضات طهاة، مآزر مطبخ',
    ],
    [
      'Chlorine bleach on coloured fabric causes permanent colour loss.\nVentilation required — never mix bleach with acidic chemicals or ammonia.',
      'مبيض الكلور على الأقمشة الملونة يسبب فقدان لون دائم.\nتهوية مطلوبة — لا تخلط المبيض مع مواد حمضية أو أمونيا.',
    ],
    [
      'Oxygen Bleach preferred for daily white linen at Triumph Plaza.\nChlorine reserved for post-outbreak hygienic resets only.',
      'مبيض الأكسجين مفضل لبياضات الأبيض اليومية في تريومف بلازا.\nالكلور محجوز لإعادة الضبط الصحي بعد التفشي فقط.',
    ],
  ),

  c(
    'bleach-non-chlorine',
    'bleach-non-chlorine',
    'bleaching',
    ['Non-Chlorine Bleach Only', 'مبيض غير كلوري فقط'],
    [
      'Only oxygen-based (non-chlorine) bleach may be used. Chlorine bleach will damage dyes and fibres.',
      'يُسمح فقط بمبيض الأكسجين (غير الكلوري). مبيض الكلور سيتلف الأصباغ والألياف.',
    ],
    [
      '1. Use Oxygen Bleach product exclusively — verify label before dosing.\n2. Add at main wash at 40°C for coloured bleach-safe items.\n3. Pre-soak heavily stained items for 30 minutes in oxygen bleach solution.\n4. Do not combine with chlorine bleach in same load or same day on shared equipment.\n5. Rinse cycle must be complete before any fabric softener addition.',
      '1. استخدم منتج مبيض الأكسجين حصرياً — تحقق من البطاقة قبل الجرعة.\n2. أضف عند الغسيل الرئيسي عند 40°م للقطع الملونة الآمنة للمبيض.\n3. انقع القطع شديدة الاتساخ 30 دقيقة في محلول مبيض الأكسجين.\n4. لا تخلط مع مبيض الكلور في نفس الحمولة أو نفس اليوم على معدات مشتركة.\n5. يجب اكتمال دورة الشطف قبل إضافة أي منعم أقمشة.',
    ],
    [
      'Coloured polycotton uniforms, pastel spa linen, patterned duvet covers, branded hotel textiles',
      'زي موحد من قطن مختلط ملون، بياضات سبا باستيل، أغطية لحاف منقوشة، منسوجات فندقية بعلامة تجارية',
    ],
    [
      'Chlorine contact causes irreversible colour stripping on non-chlorine labels.\nOxygen bleach is ineffective below 30°C — ensure wash temperature compliance.',
      'ملامسة الكلور تسبب تجريد لون لا رجعة فيه على بطاقات غير الكلور.\nمبيض الأكسجين غير فعال تحت 30°م — تأكد من الالتزام بدرجة حرارة الغسيل.',
    ],
    [
      'All coloured uniform loads at Triumph Plaza use Oxygen Bleach only.\nChlorine storage segregated in locked chemical bay — red zone.',
      'جميع حمولات الزي الملون في تريومف بلازا تستخدم مبيض الأكسجين فقط.\nتخزين الكلور منفصل في منطقة كيميائية مقفلة — المنطقة الحمراء.',
    ],
  ),

  c(
    'do-not-bleach',
    'do-not-bleach',
    'bleaching',
    ['Do Not Bleach', 'لا تبيض'],
    [
      'No bleach of any kind may be used. Bleaching agents will permanently damage colour, fibre integrity, or fabric finish.',
      'لا يُسمح بأي نوع من المبيض. عوامل التبييض ستتلف اللون أو سلامة الألياف أو تشطيب القماش نهائياً.',
    ],
    [
      '1. Verify bleach dispensers are disabled or bypassed for this load.\n2. Use Colour-Safe Detergent without optical brighteners if garment is dark.\n3. Pre-treat stains with Enzyme Prespot — never oxygen or chlorine bleach.\n4. Wash separately from white bleach loads to prevent cross-contamination.\n5. If whitening is required, escalate to professional dry clean — do not improvise.',
      '1. تأكد من تعطيل أو تجاوز موزعات المبيض لهذه الحمولة.\n2. استخدم منظفاً آمناً للألوان دون معززات بصرية إن كانت القطعة داكنة.\n3. عالج البقع بمُزيل إنزيمي — لا مبيض أكسجين أو كلور.\n4. اغسل منفصلاً عن حمولات التبييض البيضاء لمنع التلوث المتبادل.\n5. إن لزم التبييض، صعّد للتنظيف الجاف المهني — لا ترتجل.',
    ],
    [
      'Wool suiting, silk ties, navy uniforms, leather-accent garments, dark denim staff wear',
      'بدلات صوف، ربطات حرير، زي كحلي، ملابس بلمسات جلد، ملابس موظفين دنيم داكن',
    ],
    [
      'Even trace chlorine from previous loads can cause spotting — run bleach-free rinse cycle first.\nOptical brighteners in some detergents count as bleach agents — use approved products only.',
      'حتى آثار الكلور من حمولات سابقة قد تسبب بقعاً — شغّل دورة شطف خالية من المبيض أولاً.\nالمعززات البصرية في بعض المنظفات تُعد عوامل تبييض — استخدم منتجات معتمدة فقط.',
    ],
    [
      'Bleach-free program flag on tunnel washer touch panel: NO-BLEACH.\nMandatory for all guest-owned coloured garments at intake.',
      'علم برنامج خالٍ من المبيض على لوحة الغسالة النفقية: NO-BLEACH.\nإلزامي لجميع ملابس الضيوف الملونة المملوكة عند الاستلام.',
    ],
  ),

  c(
    'tumble-dry',
    'tumble-dry',
    'drying',
    ['Tumble Dry', 'تجفيف بالمجفف'],
    [
      'The garment may be dried in a tumble dryer at the heat setting indicated on the care label.',
      'يمكن تجفيف القطعة في مجفف دوّار وفق إعداد الحرارة المحدد على بطاقة العناية.',
    ],
    [
      '1. Select heat level matching the care label dots (low, medium, or high).\n2. Load dryer to 70% capacity — overloading prevents even drying.\n3. Use moisture sensor cycle where available; avoid timed over-drying.\n4. Remove immediately at cycle end to minimize creasing.\n5. Cool-down phase mandatory for all hotel linen — prevents heat-set wrinkles.',
      '1. اختر مستوى حرارة يطابق نقاط بطاقة العناية (منخفض، متوسط، أو عالٍ).\n2. حمّل المجفف بسعة 70% — الإفراط يمنع التجفيف المتساوي.\n3. استخدم دورة مستشعر الرطوبة حيثما توفرت؛ تجنب التجفيف الزائد بالوقت.\n4. أخرج فور انتهاء الدورة لتقليل التجعد.\n5. مرحلة التبريد إلزامية لجميع بياضات الفندق — تمنع التجاعيد المثبتة بالحرارة.',
    ],
    [
      'Cotton towels, polycotton sheets, housekeeping uniforms, terry bathrobes',
      'مناشف قطنية، ملاءات قطن مختلط، زي التدبير المنزلي، أردية حمام تيري',
    ],
    [
      'Over-drying cotton causes shrinkage and fibre brittleness.\nClean lint filters before every load — fire risk in commercial dryers.',
      'التجفيف الزائد للقطن يسبب انكماشاً وهشاشة ألياف.\nنظّف مرشحات الوبر قبل كل حمولة — خطر حريق في المجافف التجارية.',
    ],
    [
      'Tunnel dryer Line A for sheets; Line B for towels at Triumph Plaza.\nTarget moisture retention: 0% for linen, check guest garments individually.',
      'مجفف نفقي خط أ للملاءات؛ خط ب للمناشف في تريومف بلازا.\nالرطوبة المستهدفة: 0% للبياضات، افحص ملابس الضيوف فردياً.',
    ],
  ),

  c(
    'tumble-low',
    'tumble-low',
    'drying',
    ['Tumble Dry Low Heat', 'تجفيف بالمجفف حرارة منخفضة'],
    [
      'The garment must be tumble dried on a low heat setting to prevent shrinkage and heat damage to sensitive fibres.',
      'يجب تجفيف القطعة في المجفف بإعداد حرارة منخفضة لمنع الانكماش والضرر الحراري للألياف الحساسة.',
    ],
    [
      '1. Set commercial dryer to Low Heat — maximum 50°C drum temperature.\n2. Use moisture sensor cycle; remove while slightly damp if ironing follows.\n3. Do not add dryer sheets to spa or allergy-sensitive guest loads.\n4. Separate from high-heat towel loads to prevent mixed-temperature damage.\n5. If garment emerges shrunken, stop — do not re-dry on higher heat.',
      '1. اضبط المجفف التجاري على حرارة منخفضة — 50°م درجة أسطوانة كحد أقصى.\n2. استخدم دورة مستشعر الرطوبة؛ أخرج رطباً قليلاً إن تبع الكي.\n3. لا تضف أوراق مجفف لحمولات سبا أو ضيوف حساسي الحساسية.\n4. افصل عن حمولات المناشف عالية الحرارة لمنع ضرر درجات الحرارة المختلطة.\n5. إن انكمشت القطعة، توقف — لا تجفف مجدداً بحرارة أعلى.',
    ],
    [
      'Synthetic uniforms, elastane blends, microfibre cleaning cloths, printed resort polo shirts',
      'زي تركيبي، خلطات إيلاستان، أقمشة تنظيف ميكروفايبر، قمصان بولو منتجع مطبوعة',
    ],
    [
      'Low heat does not prevent shrinkage on wool — wool should not be tumble dried.\nStatic buildup on synthetics — use anti-static program if available.',
      'الحرارة المنخفضة لا تمنع انكماش الصوف — لا يُجفف الصوف في المجفف.\nتراكم كهرباء ساكنة على التركيبيات — استخدم برنامج مضاد للكهرباء الساكنة إن توفر.',
    ],
    [
      'Default dryer setting for all guest garment finishing at Triumph Plaza.\nDryer #3 in VIP bay locked to Low Heat only.',
      'إعداد المجفف الافتراضي لجميع تشطيبات ملابس الضيوف في تريومف بلازا.\nالمجفف #3 في منطقة كبار الشخصيات مقفل على حرارة منخفضة فقط.',
    ],
  ),

  c(
    'tumble-medium',
    'tumble-medium',
    'drying',
    ['Tumble Dry Medium Heat', 'تجفيف بالمجفف حرارة متوسطة'],
    [
      'The garment may be tumble dried on medium heat — standard for most cotton and blended hotel textiles.',
      'يمكن تجفيف القطعة في المجفف بحرارة متوسطة — قياسي لمعظم القطن والمنسوجات الفندقية المختلطة.',
    ],
    [
      '1. Set dryer to Medium Heat — approximately 60–65°C drum temperature.\n2. Load with similar fabric types; avoid mixing heavy terry with lightweight polycotton.\n3. Run full sensor cycle with cool-down.\n4. Fold or press within 15 minutes of removal to reduce labor crease recovery.\n5. Log cycle time for productivity tracking on housekeeping linen.',
      '1. اضبط المجفف على حرارة متوسطة — حوالي 60–65°م درجة أسطوانة.\n2. حمّل أنواع أقمشة متشابهة؛ تجنب خلط تيري ثقيل مع قطن مختلط خفيف.\n3. شغّل دورة مستشعر كاملة مع تبريد.\n4. اطوِ أو اكوي خلال 15 دقيقة من الإخراج لتقليل استعادة التجاعيد.\n5. سجّل وقت الدورة لتتبع الإنتاجية على بياضات التدبير المنزلي.',
    ],
    [
      'Polycotton pillowcases, spa towels (medium weight), staff polo shirts, duvet covers',
      'أكياس وسائد قطن مختلط، مناشف سبا (وزن متوسط)، قمصان بولو موظفين، أغطية لحاف',
    ],
    [
      'Medium heat on elastane above 8% causes permanent loss of stretch.\nNever medium-heat dry garments with Do Not Tumble companion symbols.',
      'الحرارة المتوسطة على إيلاستان فوق 8% تسبب فقدان مرونة دائم.\nلا تجفف بحرارة متوسطة قطعاً لها رموز لا تجفف بالمجفف مرافقة.',
    ],
    [
      'Standard setting for daily housekeeping linen reset at Triumph Plaza.\nTarget: 45-minute cycle for full load of queen sheets.',
      'الإعداد القياسي لإعادة ضبط بياضات التدبير المنزلي اليومية في تريومف بلازا.\nالهدف: دورة 45 دقيقة لحمولة كاملة من ملاءات كوين.',
    ],
  ),

  c(
    'tumble-high',
    'tumble-high',
    'drying',
    ['Tumble Dry High Heat', 'تجفيف بالمجفف حرارة عالية'],
    [
      'The garment may be tumble dried on high heat — typically for durable white cotton that tolerates thermal finishing.',
      'يمكن تجفيف القطعة في المجفف بحرارة عالية — عادة للقطن الأبيض المتين الذي يتحمل التشطيب الحراري.',
    ],
    [
      '1. Restrict to 100% white cotton towels and institutional linen only.\n2. Set dryer to High Heat — maximum 75°C drum temperature.\n3. Run to full dryness for hygienic storage compliance.\n4. Cool-down phase minimum 5 minutes before unload.\n5. Inspect for scorch marks on hem folds — reduce heat if yellowing appears.',
      '1. قيّد على مناشف قطنية بيضاء 100% وبياضات مؤسسية فقط.\n2. اضبط المجفف على حرارة عالية — 75°م درجة أسطوانة كحد أقصى.\n3. جفّف بالكامل للامتثال للتخزين الصحي.\n4. مرحلة تبريد 5 دقائق كحد أدنى قبل التفريغ.\n5. افحص علامات احتراق على طيات الحواف — قلّل الحرارة إن ظهر اصفرار.',
    ],
    [
      'White bath towels, kitchen terry cloths, mop heads, heavy-duty pool towels',
      'مناشف حمام بيضاء، أقمشة تيري مطبخ، رؤوس ممسحات، مناشف مسبح ثقيلة',
    ],
    [
      'High heat permanently damages all synthetics, wool, and silk.\nScorch risk on folded hems — do not overload drum.',
      'الحرارة العالية تتلف جميع التركيبيات والصوف والحرير نهائياً.\nخطر احتراق على طيات الحواف — لا تفرط في تحميل الأسطوانة.',
    ],
    [
      'High-heat dryers restricted to towel tunnel only at Triumph Plaza.\nGuest garments are never processed on high heat — policy violation.',
      'مجافف الحرارة العالية مقيدة بأنفاق المناشف فقط في تريومف بلازا.\nملابس الضيوف لا تُعالج أبداً بحرارة عالية — مخالفة سياسة.',
    ],
  ),

  c(
    'hang-dry',
    'hang-dry',
    'drying',
    ['Hang Dry', 'تجفيف معلق'],
    [
      'The garment should be hung on a line or hanger to air dry naturally without tumble drying.',
      'يجب تعليق القطعة على حبل أو علاقة لتجفيفها طبيعياً بالهواء دون مجفف.',
    ],
    [
      '1. Shake garment gently to release wrinkles before hanging.\n2. Use padded hangers for structured jackets; clip hangers for trousers.\n3. Hang in well-ventilated drying room — avoid direct sunlight on coloured items.\n4. Space garments to allow air circulation between pieces.\n5. Iron or press while slightly damp for best finish on guest garments.',
      '1. هزّ القطعة بلطف لإطلاق التجاعيد قبل التعليق.\n2. استخدم علاقات مبطنة للسترات المنظمة؛ علاقات مشبك للسراويل.\n3. علّق في غرفة تجفيف جيدة التهوية — تجنب أشعة الشمس المباشرة على الملون.\n4. افصل القطع للسماح بدوران الهواء بينها.\n5. اكوي أثناء الرطوبة الخفيفة لأفضل تشطيب لملابس الضيوف.',
    ],
    [
      'Wool suiting, linen resort shirts, pleated banquet skirts, structured uniform blazers',
      'بدلات صوف، قمصان منتجع كتان، تنانير حفلات مطوية، سترات زي منظمة',
    ],
    [
      'Direct sunlight fades navy and black uniform dyes within hours.\nShoulder stretch on knitwear — use flat-dry instead for heavy knits.',
      'أشعة الشمس المباشرة تبهت أصباغ الزي الكحلي والأسود خلال ساعات.\nتمدد الكتف على الحياكات — استخدم التجفيف المسطح للحياكات الثقيلة.',
    ],
    [
      'Dedicated hang-dry rack in VIP finishing room at Triumph Plaza.\nHumidity-controlled — target 45% RH for optimal air-dry time.',
      'رف تجفيف معلق مخصص في غرفة تشطيب كبار الشخصيات في تريومف بلازا.\nرطوبة مضبوطة — هدف 45% رطوبة نسبية لوقت تجفيف هوائي مثالي.',
    ],
  ),

  c(
    'flat-dry',
    'flat-dry',
    'drying',
    ['Flat Dry', 'تجفيف مسطح'],
    [
      'The garment must be dried flat on a clean surface to prevent stretching, distortion, or shoulder drop in knits.',
      'يجب تجفيف القطعة مسطحة على سطح نظيف لمنع التمدد أو التشوه أو هبوط الكتف في الحياكات.',
    ],
    [
      '1. Lay garment on clean mesh drying rack or white cotton towel.\n2. Reshape to original dimensions while damp — align seams and hems.\n3. Turn once when top surface is dry to ensure even drying.\n4. Never hang wet knits — gravity causes irreversible elongation.\n5. Block wool items to measurement template if available in VIP bay.',
      '1. ضع القطعة على رف تجفيف شبكي نظيف أو منشفة قطنية بيضاء.\n2. أعد تشكيلها لأبعادها الأصلية وهي رطبة — حاذِ الخيوط والحواف.\n3. اقلبها مرة عندما يجف السطح العلوي لضمان تجفيف متساوٍ.\n4. لا تعلق الحياكات الرطبة أبداً — الجاذبية تسبب استطالة لا رجعة فيها.\n5. ثبّت قطع الصوف على قالب قياس إن توفر في منطقة كبار الشخصيات.',
    ],
    [
      'Cashmere sweaters, fine knit cardigans, heavy wool throws, embroidered table runners',
      'سترات كشمير، كارديجانات حياكة ناعمة، أغطية صوف ثقيلة، ممرات مائدة مطرزة',
    ],
    [
      'Colour transfer risk when drying on unclean surfaces — always use fresh towel or rack.\nCats and pests in open drying areas — keep VIP flat-dry room secured.',
      'خطر انتقال لون عند التجفيف على أسطح غير نظيفة — استخدم منشفة أو رفاً نظيفاً دائماً.\nالقطط والآفات في مناطق التجفيف المفتوحة — أبقِ غرفة التجفيف المسطح لكبار الشخصيات مؤمّنة.',
    ],
    [
      'Flat-dry mesh tables in VIP bay — capacity 12 garments.\nKnitwear hang-dry is a policy violation at Triumph Plaza.',
      'طاولات شبكية للتجفيف المسطح في منطقة كبار الشخصيات — سعة 12 قطعة.\nتعليق الحياكات للتجفيف مخالفة سياسة في تريومف بلازا.',
    ],
  ),

  c(
    'drip-dry',
    'drip-dry',
    'drying',
    ['Drip Dry', 'تجفيف بالتقطير'],
    [
      'The garment may be hung while wet and allowed to drip dry without wringing — water drains by gravity.',
      'يمكن تعليق القطعة رطبة والسماح بتجفيفها بالتقطير دون عصر — الماء ينزل بالجاذبية.',
    ],
    [
      '1. After wash, gently smooth seams — do not wring or spin aggressively.\n2. Hang on non-rusting hanger with adequate drip tray below.\n3. Allow full drip phase in ventilated area before moving to finishing.\n4. Use low-spin wash cycle to reduce drip time without fabric stress.\n5. Press or steam only after fully dry unless label permits damp ironing.',
      '1. بعد الغسيل، نعّم الخيوط بلطف — لا تعصر أو تدور بقوة.\n2. علّق على علاقة غير صدئة مع صينية تقطير كافية أسفلها.\n3. اسمح بمرحلة تقطير كاملة في منطقة مهواة قبل النقل للتشطيب.\n4. استخدم دورة غسيل بدوران منخفض لتقليل وقت التقطير دون إجهاد القماش.\n5. اكوي أو بخار فقط بعد الجفاف الكامل إلا إن سمحت البطاقة بالكي الرطب.',
    ],
    [
      'Polyester curtains, shower liners, swimwear, synthetic spa wraps, raincoat uniforms',
      'ستائر بوليستر، بطانات دش، ملابس سباحة، أغطية سبا تركيبية، زي معاطف مطر',
    ],
    [
      'Drip trays must be emptied to prevent slip hazards on laundry floor.\nWater dripping on garments below causes colour streaking — maintain spacing.',
      'يجب تفريغ صواني التقطير لمنع مخاطر الانزلاق في أرضية الغسيل.\nتقطير الماء على الملابس أسفلها يسبب خطوط لون — حافظ على التباعد.',
    ],
    [
      'Drip-dry zone adjacent to washer-extractor #4 for synthetic spa textiles.\nHousekeeping curtain program ends with drip-dry rack assignment.',
      'منطقة تجفيف بالتقطير بجوار المستخرجة #4 لمنسوجات سبا تركيبية.\nبرنامج ستائر التدبير المنزلي ينتهي بتعيين رف تجفيف بالتقطير.',
    ],
  ),

  c(
    'do-not-tumble',
    'do-not-tumble',
    'drying',
    ['Do Not Tumble Dry', 'لا تجفف بالمجفف'],
    [
      'The garment must not be placed in a tumble dryer. Heat and mechanical action will cause shrinkage, melting, or permanent damage.',
      'يجب عدم وضع القطعة في مجفف دوّار. الحرارة والتحريك الميكانيكي يسببان انكماشاً أو ذوباناً أو ضرراً دائماً.',
    ],
    [
      '1. Remove from washer immediately — do not allow crease setting in damp bundle.\n2. Shake out and hang-dry or flat-dry per companion care symbols.\n3. Block access to tumble dryers for tagged items at finishing station.\n4. If accidentally tumbled, inspect for heat damage before returning to guest.\n5. Document incident and notify Laundry Manager for guest-owned items.',
      '1. أخرج من الغسالة فوراً — لا تسمح بتثبيت التجاعيد في حزمة رطبة.\n2. هزّ وعلّق للتجفيف أو جفّف مسطحاً وفق رموز العناية المرافقة.\n3. احجب الوصول للمجافف للقطع الموسومة عند محطة التشطيب.\n4. إن جُففت بالمجفف بالخطأ، افحص ضرر الحرارة قبل الإرجاع للضيف.\n5. وثّق الحادث وأبلغ مدير الغسيل لقطع الضيوف المملوكة.',
    ],
    [
      'Wool coats, silk dresses, rubber-backed mats, pleated uniforms, flame-retardant drapes',
      'معاطف صوف، فساتين حرير، سجاد بظهر مطاطي، زي مطوي، ستائر مقاومة للهب',
    ],
    [
      'A single tumble cycle can shrink wool by two sizes irreversibly.\nRubber-backed items melt and contaminate dryer drums.',
      'دورة مجفف واحدة قد تنكمش الصوف مقاسين لا رجعة فيه.\nالقطع بظهر مطاطي تذوب وتلوث أسطوانات المجفف.',
    ],
    [
      'Red No-Tumble tags at Triumph Plaza finishing intake — mandatory scan.\nGuest garment accident protocol: full compensation review by Front Office.',
      'بطاقات حمراء لا مجفف عند استلام التشطيب في تريومف بلازا — مسح إلزامي.\nبروتوكول حادث ملابس الضيف: مراجعة تعويض كاملة من الاستقبال.',
    ],
  ),

  c(
    'iron-low',
    'iron-low',
    'ironing',
    ['Iron Low Heat (110°C)', 'كي حرارة منخفضة (110°م)'],
    [
      'The garment may be ironed at low temperature — maximum soleplate setting of 110°C, one dot.',
      'يمكن كي القطعة بدرجة حرارة منخفضة — إعداد صفيحة بحد أقصى 110°م، نقطة واحدة.',
    ],
    [
      '1. Set steam press or iron to Low — 110°C maximum soleplate temperature.\n2. Use pressing cloth on delicate surfaces — never direct contact on silk.\n3. Iron on reverse side for printed or embroidered hotel uniforms.\n4. Apply steam sparingly on acetate and triacetate blends.\n5. Hang immediately on garment rack after pressing to set finish.',
      '1. اضبط مكبس البخار أو المكواة على منخفض — 110°م درجة صفيحة كحد أقصى.\n2. استخدم قماش كي على الأسطح الحساسة — لا ملامسة مباشرة للحرير.\n3. اكوي على الجانب العكسي للزي المطبوع أو المطرز.\n4. طبّق البخار باعتدال على خلطات الأسيتات.\n5. علّق فوراً على رف الملابس بعد الكي لتثبيت التشطيب.',
    ],
    [
      'Acetate lining, triacetate blouses, delicate synthetics, some silk blends',
      'بطانة أسيتات، بلوزات تريأسيتات، تركيبيات حساسة، بعض خلطات الحرير',
    ],
    [
      'Low heat still scorches acetate — test on inner seam first.\nNever iron over embellishments, beads, or transfer logos.',
      'الحرارة المنخفضة لا تزال تحرق الأسيتات — اختبر على خياطة داخلية أولاً.\nلا تكوي فوق الزخارف أو الخرز أو شعارات النقل الحراري.',
    ],
    [
      'Steam press Station 1 locked to Low for VIP guest finishing.\nOne-dot symbol training module required for all press operators.',
      'مكبس بخار المحطة 1 مقفل على منخفض لتشطيب ضيوف كبار الشخصيات.\nوحدة تدريب رمز النقطة الواحدة مطلوبة لجميع مشغلي الكي.',
    ],
  ),

  c(
    'iron-medium',
    'iron-medium',
    'ironing',
    ['Iron Medium Heat (150°C)', 'كي حرارة متوسطة (150°م)'],
    [
      'The garment may be ironed at medium temperature — maximum 150°C, two dots. Standard for most hotel cotton and blends.',
      'يمكن كي القطعة بدرجة حرارة متوسطة — 150°م كحد أقصى، نقطتان. قياسي لمعظم قطن الفندق والخلطات.',
    ],
    [
      '1. Set press to Medium — 150°C for polycotton and wool-poly blends.\n2. Use steam for cotton; reduce steam on wool blends to prevent shine.\n3. Press conference table overlays and napkins on vacuum table for speed.\n4. Iron dark uniforms inside-out to prevent soleplate shine marks.\n5. Allow cool-down before stacking — heat-set creases transfer between layers.',
      '1. اضبط المكبس على متوسط — 150°م لقطن مختلط وخلطات صوف-بولي.\n2. استخدم البخار للقطن؛ قلّل البخار على خلطات الصوف لمنع اللمعان.\n3. اكوي أغطية طاولات المؤتمرات والمناديل على طاولة فراغ للسرعة.\n4. اكوي الزي الداكن من الداخل لمنع علامات لمعان الصفيحة.\n5. اسمح بالتبريد قبل التكديس — التجاعيد المثبتة بالحرارة تنتقل بين الطبقات.',
    ],
    [
      'Polycotton shirts, wool-poly suiting, table napkins, housekeeping tunics',
      'قمصان قطن مختلط، بدلات صوف-بولي، مناديل مائدة، جلابيب تدبير منزلي',
    ],
    [
      'Medium heat scorches polyester — verify fibre content before pressing.\nVacuum table suction must be active to prevent fabric displacement.',
      'الحرارة المتوسطة تحرق البوليستر — تحقق من محتوى الألياف قبل الكي.\nشفط طاولة الفراغ يجب أن يكون نشطاً لمنع تحريك القماش.',
    ],
    [
      'Default press setting for 80% of Triumph Plaza uniform finishing.\nVacuum table #2 dedicated to Food & Beverage linen.',
      'إعداد المكبس الافتراضي لـ 80% من تشطيب الزي في تريومف بلازا.\nطاولة فراغ #2 مخصصة لبياضات الأطعمة والمشروبات.',
    ],
  ),

  c(
    'iron-high',
    'iron-high',
    'ironing',
    ['Iron High Heat (200°C)', 'كي حرارة عالية (200°م)'],
    [
      'The garment may be ironed at high temperature — maximum 200°C, three dots. For durable cotton and linen only.',
      'يمكن كي القطعة بدرجة حرارة عالية — 200°م كحد أقصى، ثلاث نقاط. للقطن والكتان المتين فقط.',
    ],
    [
      '1. Set iron or calendar to High — 200°C for 100% cotton and linen.\n2. Use maximum steam output for deep wrinkle removal on tablecloths.\n3. Moisten linen slightly for classic crisp finish on banquet overlays.\n4. Never high-heat iron synthetics, silk, or wool — fibre melting risk.\n5. Calendar machine for sheets — hand iron only for touch-up on hem folds.',
      '1. اضبط المكواة أو الآلة على عالٍ — 200°م للقطن والكتان 100%.\n2. استخدم أقصى بخار لإزالة التجاعيد العميقة على مفارش المائدة.\n3. رطّب الكتان قليلاً لتشطيب مقرمش كلاسيكي على أغطية الحفلات.\n4. لا تكوي بحرارة عالية التركيبيات أو الحرير أو الصوف — خطر ذوبان الألياف.\n5. آلة تقويم للملاءات — كي يدوي للمسات على طيات الحواف فقط.',
    ],
    [
      'White cotton tablecloths, linen napkins, cotton chef jackets, heavy cotton drapes',
      'مفارش مائدة قطنية بيضاء، مناديل كتان، سترات طهاة قطنية، ستائر قطنية ثقيلة',
    ],
    [
      'Scorch marks on cotton are permanent — keep soleplate clean and descaled.\nHigh heat on starched linen can cause brittle fibre breakage over time.',
      'علامات الاحتراق على القطن دائمة — أبقِ الصفيحة نظيفة وخالية من الترسبات.\nالحرارة العالية على كتان مُنشَّى قد تسبب كسر ألياف هش مع الوقت.',
    ],
    [
      'Calendar mangle for banquet linen at Triumph Plaza — 200°C roller temp.\nHigh-heat restricted from all guest garment pressing stations.',
      'آلة تقويم لمفارش الحفلات في تريومف بلازا — 200°م درجة الأسطوانة.\nالحرارة العالية محجوزة عن جميع محطات كي ملابس الضيوف.',
    ],
  ),

  c(
    'steam-iron',
    'steam-iron',
    'ironing',
    ['Steam Iron', 'كي بالبخار'],
    [
      'The garment may be refreshed with steam without direct soleplate contact, or ironed with full steam assist.',
      'يمكن تجديد القطعة بالبخار دون ملامسة مباشرة للصفيحة، أو كيها بمساعدة بخار كاملة.',
    ],
    [
      '1. Use professional steam finishing cabinet or hand steamer for guest garments.\n2. Hold steamer head 2–3 cm from fabric — never touch embellishments.\n3. Steam from top to bottom; smooth with hand inside garment for shape.\n4. For steam-iron combo: set appropriate heat dot plus maximum steam.\n5. Allow 5-minute set time before bagging — residual moisture causes mildew in garment bags.',
      '1. استخدم خزانة تشطيب بخار مهنية أو مبخر يدوي لملابس الضيوف.\n2. أبقِ رأس المبخر 2–3 سم من القماش — لا تلمس الزخارف.\n3. بخّر من الأعلى للأسفل؛ نعّم باليد داخل القطعة للشكل.\n4. لكي-بخار مجتمع: اضبط نقطة الحرارة المناسبة مع أقصى بخار.\n5. اسمح بـ 5 دقائق للتثبيت قبل التغليف — الرطوبة المتبقية تسبب عفن في أكياس الملابس.',
    ],
    [
      'Wool suiting, velvet banquet chairs covers (removable), draped dresses, crushed linen resort wear',
      'بدلات صوف، أغطية كراسي حفلات مخملية (قابلة للإزالة)، فساتين منسدلة، ملابس منتجع كتان مجعد',
    ],
    [
      'Steam alone does not remove oil-based stains — pre-treat before steaming.\nVelvet must be steamed from reverse only — front steaming flattens pile permanently.',
      'البخار وحده لا يزيل بقع الزيت — عالج مسبقاً قبل التبخير.\nالمخمل يُبخر من الخلف فقط — التبخير الأمامي يسطح الوبر نهائياً.',
    ],
    [
      'Steam finishing cabinet in VIP bay — primary tool for guest suit recovery.\nBanquet velvet covers steamed between events — 15-minute turnaround.',
      'خزانة تشطيب بخار في منطقة كبار الشخصيات — الأداة الأساسية لاستعادة بدلات الضيوف.\nأغطية مخمل الحفلات تُبخر بين الفعاليات — 15 دقيقة دورة.',
    ],
  ),

  c(
    'do-not-iron',
    'do-not-iron',
    'ironing',
    ['Do Not Iron', 'لا تكوي'],
    [
      'The garment must not be ironed or pressed. Heat will melt, glaze, or permanently deform the fabric or applied finishes.',
      'يجب عدم كي أو كبس القطعة. الحرارة ستذيب أو تزجّج أو تشوّه القماش أو التشطيبات المطبقة نهائياً.',
    ],
    [
      '1. Select wrinkle-resistant or steam-refresh finishing only — no soleplate contact.\n2. Remove from dryer promptly and hang to minimize creasing at source.\n3. If creases are unacceptable, use cool air tumble or handheld steamer at safe distance.\n4. Attach Do Not Iron tag at pressing station — bypass calendar and steam press.\n5. Guest notification required if garment cannot meet presentation standard without ironing.',
      '1. اختر تشطيباً مقاوماً للتجاعيد أو تجديداً بالبخار فقط — دون ملامسة الصفيحة.\n2. أخرج من المجفف فوراً وعلّق لتقليل التجعد من المصدر.\n3. إن كانت التجاعيد غير مقبولة، استخدم مجفف هواء بارد أو مبخر يدوي على مسافة آمنة.\n4. أرفق بطاقة لا تكوي عند محطة الكي — تجاوز الآلة والمكبس.\n5. إشعار الضيف مطلوب إن لم تستوفِ القطعة معيار العرض دون كي.',
    ],
    [
      'Fleece jackets, rubberized rainwear, coated outdoor uniforms, heat-transfer logo polos, sequin gowns',
      'سترات فليس، ملابس مطر مطاطية، زي خارجي مطلي، قمصان بولو بشعار نقل حراري، فساتين مرصعة',
    ],
    [
      'Ironing melts polyurethane coatings and heat-transfer logos instantly.\nSequins and beads explode under press pressure — steam only from 30 cm minimum.',
      'الكي يذيب طلاءات البولي يوريثان وشعارات النقل الحراري فوراً.\nالخرز والترتر ينفجر تحت ضغط المكبس — بخار فقط من 30 سم كحد أدنى.',
    ],
    [
      'Do Not Iron bypass lane at Triumph Plaza pressing area — direct to garment bagging.\nEvent gown protocol: steam-only finishing with signed waiver on file.',
      'مسار تجاوز لا تكوي في منطقة الكي في تريومف بلازا — مباشرة لتغليف الملابس.\nبروتوكول فساتين الفعاليات: تشطيب بالبخار فقط مع إقرار موقع في الملف.',
    ],
  ),

  c(
    'dry-clean',
    'dry-clean',
    'dryCleaning',
    ['Dry Clean', 'تنظيف جاف'],
    [
      'The garment should be professionally dry cleaned using standard perchloroethylene or approved alternative solvents.',
      'يجب تنظيف القطعة جافاً مهنياً باستخدام بيركلوروإيثيلين القياسي أو مذيبات بديلة معتمدة.',
    ],
    [
      '1. Inspect care label and fibre content at intake — photograph for vendor ticket.\n2. Pre-treat visible stains with solvent-safe spotting agent only.\n3. Bundle in approved dry-clean bag with Triumph Plaza hotel tag and room number.\n4. Dispatch to contracted vendor within 4-hour collection window.\n5. Quality-check on return — verify odour, finish, and no shrinkage before guest delivery.',
      '1. افحص بطاقة العناية ومحتوى الألياف عند الاستلام — صوّر لتذكرة المزود.\n2. عالج البقع الظاهرة بعامل بقع آمن للمذيب فقط.\n3. جمّع في كيس تنظيف جاف معتمد مع بطاقة فندق تريومف بلازا ورقم الغرفة.\n4. أرسل للمزود المتعاقد خلال نافذة جمع 4 ساعات.\n5. افحص الجودة عند الإرجاع — تحقق من الرائحة والتشطيب وعدم الانكماش قبل تسليم الضيف.',
    ],
    [
      'Wool suits, silk dresses, tailored blazers, structured uniforms, designer guest wear',
      'بدلات صوف، فساتين حرير، سترات مفصلة، زي منظم، ملابس ضيوف مصممة',
    ],
    [
      'Do not attempt water spotting on dry-clean-only labels.\nVerify vendor uses Triumph Plaza approved solvent — no cheap hydrocarbon substitutes.',
      'لا تحاول إزالة البقع بالماء على بطاقات التنظيف الجاف فقط.\nتحقق أن المزود يستخدم مذيب تريومف بلازا المعتمد — دون بدائل هيدروكربون رخيصة.',
    ],
    [
      'Contract vendor: Plaza Elite Dry Clean — twice-daily pickup at service entrance.\nSLA: 24-hour standard, 4-hour express for VIP suites.',
      'مزود متعاقد: بلازا إيليت للتنظيف الجاف — استلام مرتين يومياً عند مدخل الخدمة.\nاتفاقية مستوى الخدمة: 24 ساعة قياسي، 4 ساعات سريع لأجنحة كبار الشخصيات.',
    ],
  ),

  c(
    'dry-clean-professional',
    'dry-clean-professional',
    'dryCleaning',
    ['Professional Dry Clean', 'تنظيف جاف مهني'],
    [
      'The garment requires professional dry cleaning with specialist handling — not in-house or standard batch processing.',
      'يتطلب القطعة تنظيفاً جافاً مهنياً بمعالجة متخصصة — ليس معالجة داخلية أو دفعية قياسية.',
    ],
    [
      '1. Flag as Professional at intake — escalate to Laundry Manager immediately.\n2. Complete specialist garment form: fibre, trim, stain map, and guest priority tier.\n3. Dispatch to Tier-1 couture vendor — never standard batch dry clean.\n4. Request hand-finish pressing and padded hanger return.\n5. Insurance documentation for items valued above hotel liability threshold.',
      '1. علّم كمهني عند الاستلام — صعّد لمدير الغسيل فوراً.\n2. أكمل نموذج قطعة متخصصة: ألياف، زخارف، خريطة بقع، وفئة أولوية الضيف.\n3. أرسل لمزود كوتور من المستوى الأول — لا تنظيف جاف دفعي قياسي.\n4. اطلب كي تشطيب يدوي وإرجاع بعلاقة مبطنة.\n5. وثائق تأمين للقطع التي تتجاوز حد مسؤولية الفندق.',
    ],
    [
      'Couture evening gowns, fur-trimmed coats, beaded jackets, bespoke suiting, archival uniform pieces',
      'فساتين سهرة كوتور، معاطف بحواف فرو، سترات مرصعة، بدلات مفصلة حسب الطلب، قطع زي أرشيفية',
    ],
    [
      'Standard dry clean damages beading adhesive and fur skin backing.\nNever store professional items in plastic — breathable garment bag only.',
      'التنظيف الجاف القياسي يتلف لاصق الترتر وظهر جلد الفرو.\nلا تخزّن القطع المهنية في بلاستيك — كيس ملابس قابل للتنفس فقط.',
    ],
    [
      'Tier-1 vendor: Atelier Prestige — dedicated account for Triumph Plaza VIP events.\nGM approval required for items exceeding USD 5,000 declared value.',
      'مزود المستوى الأول: أتيليه بريستيج — حساب مخصص لفعاليات كبار الشخصيات في تريومف بلازا.\nموافقة المدير العام مطلوبة للقطع التي تتجاوز 5000 دولار قيمة مُعلنة.',
    ],
  ),

  c(
    'petroleum-solvent',
    'petroleum-solvent',
    'dryCleaning',
    ['Petroleum Solvent Dry Clean', 'تنظيف جاف بمذيب بترولي'],
    [
      'The garment must be dry cleaned using petroleum-based solvent (hydrocarbon) — not perchloroethylene.',
      'يجب تنظيف القطعة جافاً بمذيب بترولي (هيدروكربون) — وليس بيركلوروإيثيلين.',
    ],
    [
      '1. Verify vendor hydrocarbon machine certification before dispatch.\n2. Tag with Petroleum Solvent Only — red solvent indicator on garment ticket.\n3. Do not combine with standard perc loads at vendor facility.\n4. Inspect for colour bleeding on return — hydrocarbon is gentler but slower drying.\n5. Allow 24-hour aeration after cleaning before sealing in garment bag.',
      '1. تحقق من شهادة آلة الهيدروكربون لدى المزود قبل الإرسال.\n2. علّم بمذيب بترولي فقط — مؤشر مذيب أحمر على تذكرة القطعة.\n3. لا تدمج مع حمولات perc القياسية في منشأة المزود.\n4. افحص نزيف الألوان عند الإرجاع — الهيدروكربون ألطف لكن تجفيفه أبطأ.\n5. اسمح بـ 24 ساعة تهوية بعد التنظيف قبل الإغلاق في كيس الملابس.',
    ],
    [
      'Leather-trimmed garments, bonded fabrics, garments with glued embellishments, some water-repellent finishes',
      'ملابس بحواف جلد، أقمشة ملصقة، ملابس بزخارف ملصقة، بعض تشطيبات طاردة للماء',
    ],
    [
      'Perc solvent dissolves adhesives on petroleum-solvent labels — permanent trim loss.\nHydrocarbon cleaning requires longer vendor turnaround — set guest expectations.',
      'مذيب perc يذيب اللاصقات على بطاقات المذيب البترولي — فقدان زخارف دائم.\nتنظيف الهيدروكربون يتطلب وقتاً أطول لدى المزود — اضبط توقعات الضيف.',
    ],
    [
      'Approved hydrocarbon vendor: CleanTech Green — sole provider for Triumph Plaza adhesive-trim items.\nPetroleum-solvent tag stock kept at concierge desk for guest education.',
      'مزود هيدروكربون معتمد: كلين تك جرين — المزود الوحيد لقطع تريومف بلازا ذات الزخارف الملصقة.\nمخزون بطاقات المذيب البترولي عند مكتب الكونسيرج لتثقيف الضيوف.',
    ],
  ),

  c(
    'do-not-dry-clean',
    'do-not-dry-clean',
    'dryCleaning',
    ['Do Not Dry Clean', 'لا تنظيف جاف'],
    [
      'The garment must not be dry cleaned. Solvents will dissolve coatings, swell fibres, or destroy waterproof and bonded constructions.',
      'يجب عدم التنظيف الجاف للقطعة. المذيبات ستذيب الطلاءات أو تنتفخ الألياف أو تدمر البنى المقاومة للماء والملصقة.',
    ],
    [
      '1. Process via approved aqueous wash method only — match wash symbol on label.\n2. Do not dispatch to dry-clean vendor under any circumstance.\n3. If soil level exceeds aqueous capability, consult manufacturer care sheet.\n4. Guest consultation mandatory before processing high-value Do Not Dry Clean items.\n5. Document alternative care path on garment ticket for liability protection.',
      '1. عالج بطريقة الغسيل المائي المعتمدة فقط — طابق رمز الغسيل على البطاقة.\n2. لا ترسل لمزود التنظيف الجاف تحت أي ظرف.\n3. إن تجاوز مستوى الاتساخ قدرة الغسيل المائي، راجع ورقة عناية المصنع.\n4. استشارة الضيف إلزامية قبل معالجة قطع عالية القيمة لا تنظيف جاف.\n5. وثّق مسار العناية البديل على تذكرة القطعة لحماية المسؤولية.',
    ],
    [
      'Gore-Tex outerwear, PVC-coated aprons, latex-backed curtains, some athletic performance wear',
      'ملابس خارجية غور-تكس، مآزر مطلية PVC، ستائر بظهر لاتكس، بعض ملابس الأداء الرياضي',
    ],
    [
      'Dry-clean solvent strips DWR (durable water repellent) coatings permanently.\nPVC and rubber components crack and peel after solvent exposure.',
      'مذيب التنظيف الجاف يزيل طلاءات DWR (طارد الماء المتين) نهائياً.\nمكونات PVC والمطاط تتشقق وتتقشر بعد التعرض للمذيب.',
    ],
    [
      'Do Not Dry Clean items routed to specialist aqueous outerwear program.\nPool attendant uniforms — in-house wash only, never vendor dry clean.',
      'قطع لا تنظيف جاف تُوجّه لبرنامج ملابس خارجية مائي متخصص.\nزي منسقي المسبح — غسيل داخلي فقط، لا تنظيف جاف لدى المزود أبداً.',
    ],
  ),
];

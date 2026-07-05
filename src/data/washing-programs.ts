import type { LocalizedText } from '@/data/laundry-chemicals';

export type { LocalizedText };

export type ProgramStep = {
  step: number;
  process: LocalizedText;
  waterLevel: string;
  temperature: LocalizedText;
};

export type WashingProgram = {
  id: number;
  title: LocalizedText;
  durationMin: number;
  temperatureBadge: LocalizedText;
  footerNote: LocalizedText;
  steps: readonly ProgramStep[];
};

const cold = { en: 'Cold', ar: 'بارد' } as const;
const dash = { en: '-', ar: '-' } as const;

export const washingPrograms: readonly WashingProgram[] = [
  {
    id: 1,
    title: { en: 'Bed Sheets', ar: 'ملاءات بيضاء' },
    durationMin: 43,
    temperatureBadge: { en: '55°C', ar: '55°م' },
    footerNote: {
      en: 'White sheets — Program No. 1',
      ar: 'ملاءات بيضاء — برنامج رقم 1',
    },
    steps: [
      { step: 1, process: { en: 'Rinse', ar: 'شطفة' }, waterLevel: '2', temperature: cold },
      {
        step: 2,
        process: { en: 'Wash (without drainage)', ar: 'غسيل (بدون تصريف)' },
        waterLevel: '1',
        temperature: { en: '55', ar: '55' },
      },
      {
        step: 3,
        process: { en: 'Main wash', ar: 'غسلة رئيسية' },
        waterLevel: '1',
        temperature: { en: '70', ar: '70' },
      },
      { step: 4, process: { en: 'First rinse', ar: 'شطفة أولى' }, waterLevel: '2', temperature: cold },
      { step: 5, process: { en: 'Second rinse', ar: 'شطفة ثانية' }, waterLevel: '2', temperature: cold },
      { step: 6, process: { en: 'Minor spin', ar: 'عصرة صغرى' }, waterLevel: '-', temperature: dash },
      { step: 7, process: { en: 'Third rinse', ar: 'شطفة ثالثة' }, waterLevel: '2', temperature: cold },
      { step: 8, process: { en: 'Sour', ar: 'ساور' }, waterLevel: '1', temperature: cold },
      { step: 9, process: { en: 'Final spin', ar: 'عصرة أخيرة' }, waterLevel: '-', temperature: dash },
    ],
  },
  {
    id: 2,
    title: { en: 'Pillow Cases', ar: 'أكياس وسائد' },
    durationMin: 43,
    temperatureBadge: { en: '55°C', ar: '55°م' },
    footerNote: {
      en: 'Pillow cases — Program No. 2',
      ar: 'أكياس وسائد — برنامج رقم 2',
    },
    steps: [
      { step: 1, process: { en: 'Rinse', ar: 'شطفة' }, waterLevel: '2', temperature: cold },
      {
        step: 2,
        process: { en: 'Wash (without drainage)', ar: 'غسيل (بدون تصريف)' },
        waterLevel: '1',
        temperature: { en: '55', ar: '55' },
      },
      {
        step: 3,
        process: { en: 'Main wash', ar: 'غسلة رئيسية' },
        waterLevel: '1',
        temperature: { en: '70', ar: '70' },
      },
      { step: 4, process: { en: 'First rinse', ar: 'شطفة أولى' }, waterLevel: '2', temperature: cold },
      { step: 5, process: { en: 'Second rinse', ar: 'شطفة ثانية' }, waterLevel: '2', temperature: cold },
      { step: 6, process: { en: 'Low spin', ar: 'عصرة صغرى' }, waterLevel: '-', temperature: dash },
      { step: 7, process: { en: 'Third rinse', ar: 'شطفة ثالثة' }, waterLevel: '2', temperature: cold },
      { step: 8, process: { en: 'Sour', ar: 'ساور' }, waterLevel: '1', temperature: cold },
      { step: 9, process: { en: 'Final spin', ar: 'عصرة أخيرة' }, waterLevel: '-', temperature: dash },
    ],
  },
  {
    id: 3,
    title: { en: 'White Towels', ar: 'مناشف بيضاء' },
    durationMin: 48,
    temperatureBadge: { en: '55°C', ar: '55°م' },
    footerNote: {
      en: 'White towels and table napkins — Program No. 3',
      ar: 'مناشف بيضاء ومناديل مائدة — برنامج رقم 3',
    },
    steps: [
      { step: 1, process: { en: 'First rinse', ar: 'شطفة أولى' }, waterLevel: '2', temperature: cold },
      {
        step: 2,
        process: { en: 'Wash (without drainage)', ar: 'غسيل (بدون تصريف)' },
        waterLevel: '1',
        temperature: { en: '55', ar: '55' },
      },
      {
        step: 3,
        process: { en: 'Main wash', ar: 'غسلة رئيسية' },
        waterLevel: '1',
        temperature: { en: '70', ar: '70' },
      },
      { step: 4, process: { en: 'First rinse', ar: 'شطفة أولى' }, waterLevel: '2', temperature: cold },
      { step: 5, process: { en: 'Second rinse', ar: 'شطفة ثانية' }, waterLevel: '2', temperature: cold },
      { step: 6, process: { en: 'Minor spin', ar: 'عصرة صغرى' }, waterLevel: '-', temperature: dash },
      { step: 7, process: { en: 'Third rinse', ar: 'شطفة ثالثة' }, waterLevel: '2', temperature: cold },
      { step: 8, process: { en: 'Soft + Sour', ar: 'سوفت + ساور' }, waterLevel: '1', temperature: cold },
      { step: 9, process: { en: 'Final spin', ar: 'عصرة أخيرة' }, waterLevel: '-', temperature: dash },
    ],
  },
  {
    id: 4,
    title: { en: 'Pool Towels', ar: 'مناشف السباحة' },
    durationMin: 33,
    temperatureBadge: { en: '50°C', ar: '50°م' },
    footerNote: {
      en: 'Swimming pool towels — Program No. 4',
      ar: 'مناشف حمام السباحة — برنامج رقم 4',
    },
    steps: [
      { step: 1, process: { en: 'Rinse', ar: 'شطفة' }, waterLevel: '2', temperature: cold },
      { step: 2, process: { en: 'Wash', ar: 'غسيل' }, waterLevel: '1', temperature: { en: '50', ar: '50' } },
      { step: 4, process: { en: 'First rinse', ar: 'شطفة أولى' }, waterLevel: '2', temperature: cold },
      { step: 5, process: { en: 'Second rinse', ar: 'شطفة ثانية' }, waterLevel: '2', temperature: cold },
      { step: 6, process: { en: 'Low spin', ar: 'عصرة صغرى' }, waterLevel: '-', temperature: dash },
      { step: 7, process: { en: 'Third rinse', ar: 'شطفة ثالثة' }, waterLevel: '2', temperature: cold },
      { step: 8, process: { en: 'Sour', ar: 'ساور' }, waterLevel: '1', temperature: cold },
      { step: 9, process: { en: 'Final spin', ar: 'عصرة أخيرة' }, waterLevel: '-', temperature: dash },
    ],
  },
  {
    id: 5,
    title: { en: 'White Table Linen', ar: 'مفارش ومناديل مائدة بيضاء' },
    durationMin: 48,
    temperatureBadge: { en: '75°C', ar: '75°م' },
    footerNote: {
      en: 'White table linen and napkins — Program No. 5',
      ar: 'مفارش ومناديل مائدة بيضاء — برنامج رقم 5',
    },
    steps: [
      { step: 1, process: { en: 'First rinse', ar: 'شطفة أولى' }, waterLevel: '2', temperature: cold },
      {
        step: 2,
        process: { en: 'Wash (with drainage)', ar: 'غسيل (مع التصريف)' },
        waterLevel: '1',
        temperature: { en: '75', ar: '75' },
      },
      { step: 3, process: { en: 'Rinse', ar: 'شطفة' }, waterLevel: '2', temperature: cold },
      { step: 4, process: { en: 'Bleaching', ar: 'تبييض' }, waterLevel: '1', temperature: { en: '60', ar: '60' } },
      { step: 5, process: { en: 'First rinse', ar: 'شطفة أولى' }, waterLevel: '2', temperature: cold },
      { step: 6, process: { en: 'Second rinse', ar: 'شطفة ثانية' }, waterLevel: '2', temperature: cold },
      { step: 7, process: { en: 'Low spin', ar: 'عصرة صغرى' }, waterLevel: '-', temperature: dash },
      { step: 8, process: { en: 'Third rinse', ar: 'شطفة ثالثة' }, waterLevel: '2', temperature: cold },
      { step: 9, process: { en: 'Sour', ar: 'ساور' }, waterLevel: '1', temperature: cold },
    ],
  },
  {
    id: 6,
    title: { en: 'Colored Table Linen', ar: 'مفارش ومناديل مائدة ملونة' },
    durationMin: 36,
    temperatureBadge: { en: '55°C', ar: '55°م' },
    footerNote: {
      en: 'Colored table linen and napkins — Program No. 6',
      ar: 'مفارش ومناديل مائدة ملونة — برنامج رقم 6',
    },
    steps: [
      { step: 1, process: { en: 'First rinse', ar: 'شطفة أولى' }, waterLevel: '2', temperature: cold },
      {
        step: 2,
        process: { en: 'Wash (without draining)', ar: 'غسيل (بدون تصريف)' },
        waterLevel: '1',
        temperature: { en: '55', ar: '55' },
      },
      {
        step: 3,
        process: { en: 'Main wash', ar: 'غسلة رئيسية' },
        waterLevel: '1',
        temperature: { en: '65', ar: '65' },
      },
      { step: 4, process: { en: 'First rinse', ar: 'شطفة أولى' }, waterLevel: '2', temperature: cold },
      { step: 5, process: { en: 'Second rinse', ar: 'شطفة ثانية' }, waterLevel: '2', temperature: cold },
      { step: 6, process: { en: 'Small spin', ar: 'عصرة صغرى' }, waterLevel: '-', temperature: dash },
      { step: 7, process: { en: 'Third rinse', ar: 'شطفة ثالثة' }, waterLevel: '2', temperature: cold },
      { step: 8, process: { en: 'Sour', ar: 'ساور' }, waterLevel: '1', temperature: cold },
      { step: 9, process: { en: 'Final spin', ar: 'عصرة أخيرة' }, waterLevel: '-', temperature: dash },
    ],
  },
  {
    id: 7,
    title: { en: 'Kitchen Jacket', ar: 'سترات مطبخ / ملابس بيضاء مرتجعة' },
    durationMin: 55,
    temperatureBadge: { en: '80°C', ar: '80°م' },
    footerNote: {
      en: 'Kitchen jackets and returned white clothes — Program No. 7',
      ar: 'سترات مطبخ وملابس بيضاء مرتجعة — برنامج رقم 7',
    },
    steps: [
      { step: 1, process: { en: 'First rinse', ar: 'شطفة أولى' }, waterLevel: '2', temperature: cold },
      {
        step: 2,
        process: { en: 'Wash (with drain)', ar: 'غسيل (مع التصريف)' },
        waterLevel: '1',
        temperature: { en: '80', ar: '80' },
      },
      { step: 3, process: { en: 'Rinse', ar: 'شطفة' }, waterLevel: '2', temperature: cold },
      { step: 4, process: { en: 'Bleaching', ar: 'تبييض' }, waterLevel: '1', temperature: { en: '60', ar: '60' } },
      { step: 5, process: { en: 'First rinse', ar: 'شطفة أولى' }, waterLevel: '2', temperature: cold },
      { step: 6, process: { en: 'Second rinse', ar: 'شطفة ثانية' }, waterLevel: '2', temperature: cold },
      { step: 7, process: { en: 'Small spin/extraction', ar: 'عصرة صغرى' }, waterLevel: '-', temperature: dash },
      { step: 8, process: { en: 'Third rinse', ar: 'شطفة ثالثة' }, waterLevel: '2', temperature: cold },
      { step: 9, process: { en: 'Sour', ar: 'ساور' }, waterLevel: '1', temperature: cold },
    ],
  },
  {
    id: 8,
    title: { en: 'Light Uniform', ar: 'ملابس زي موحد فاتحة' },
    durationMin: 36,
    temperatureBadge: { en: '55°C', ar: '55°م' },
    footerNote: {
      en: 'Light uniform clothing — Program No. 8',
      ar: 'ملابس زي موحد فاتحة — برنامج رقم 8',
    },
    steps: [
      { step: 1, process: { en: 'First rinse', ar: 'شطفة أولى' }, waterLevel: '2', temperature: cold },
      {
        step: 2,
        process: { en: 'Wash (without drainage)', ar: 'غسيل (بدون تصريف)' },
        waterLevel: '1',
        temperature: { en: '55', ar: '55' },
      },
      {
        step: 3,
        process: { en: 'Main wash', ar: 'غسلة رئيسية' },
        waterLevel: '1',
        temperature: { en: '65', ar: '65' },
      },
      { step: 4, process: { en: 'First rinse', ar: 'شطفة أولى' }, waterLevel: '2', temperature: cold },
      { step: 5, process: { en: 'Second rinse', ar: 'شطفة ثانية' }, waterLevel: '2', temperature: cold },
      { step: 6, process: { en: 'Minor spin', ar: 'عصرة صغرى' }, waterLevel: '-', temperature: dash },
      { step: 7, process: { en: 'Third rinse', ar: 'شطفة ثالثة' }, waterLevel: '2', temperature: cold },
      { step: 8, process: { en: 'Sour', ar: 'ساور' }, waterLevel: '1', temperature: cold },
      { step: 9, process: { en: 'Final spin', ar: 'عصرة أخيرة' }, waterLevel: '-', temperature: dash },
    ],
  },
  {
    id: 9,
    title: { en: 'Dark Uniform', ar: 'ملابس زي موحد داكنة' },
    durationMin: 31,
    temperatureBadge: { en: 'Cold', ar: 'بارد' },
    footerNote: {
      en: 'Dark uniform clothing — Program No. 9',
      ar: 'ملابس زي موحد داكنة — برنامج رقم 9',
    },
    steps: [
      { step: 1, process: { en: 'First rinse', ar: 'شطفة أولى' }, waterLevel: '2', temperature: cold },
      { step: 2, process: { en: 'Wash 1', ar: 'غسيل 1' }, waterLevel: '1', temperature: cold },
      { step: 3, process: { en: 'First rinse', ar: 'شطفة أولى' }, waterLevel: '2', temperature: cold },
      { step: 4, process: { en: 'Second rinse', ar: 'شطفة ثانية' }, waterLevel: '2', temperature: cold },
      { step: 5, process: { en: 'Low spin', ar: 'عصرة صغرى' }, waterLevel: '-', temperature: dash },
      { step: 6, process: { en: 'Third rinse', ar: 'شطفة ثالثة' }, waterLevel: '2', temperature: cold },
      { step: 7, process: { en: 'Softener', ar: 'سوفت' }, waterLevel: '1', temperature: cold },
      { step: 8, process: { en: 'Final spin', ar: 'عصرة أخيرة' }, waterLevel: '-', temperature: dash },
    ],
  },
  {
    id: 10,
    title: { en: 'Colored Towels', ar: 'مناشف ملونة' },
    durationMin: 31,
    temperatureBadge: { en: 'Cold', ar: 'بارد' },
    footerNote: {
      en: 'Guest clothes — Program No. 10',
      ar: 'ملابس النزلاء — برنامج رقم 10',
    },
    steps: [
      { step: 1, process: { en: 'First rinse', ar: 'شطفة أولى' }, waterLevel: '2', temperature: cold },
      { step: 2, process: { en: 'Wash 1', ar: 'غسيل 1' }, waterLevel: '1', temperature: cold },
      { step: 3, process: { en: 'First rinse', ar: 'شطفة أولى' }, waterLevel: '2', temperature: cold },
      { step: 4, process: { en: 'Second rinse', ar: 'شطفة ثانية' }, waterLevel: '2', temperature: cold },
      { step: 5, process: { en: 'Minor spin', ar: 'عصرة صغرى' }, waterLevel: '-', temperature: dash },
      { step: 6, process: { en: 'Third rinse', ar: 'شطفة ثالثة' }, waterLevel: '2', temperature: cold },
      { step: 7, process: { en: 'Soft', ar: 'سوفت' }, waterLevel: '1', temperature: cold },
      { step: 8, process: { en: 'Final spin', ar: 'عصرة أخيرة' }, waterLevel: '-', temperature: dash },
    ],
  },
  {
    id: 11,
    title: { en: 'Sour Bath', ar: 'حمام ساور' },
    durationMin: 25,
    temperatureBadge: { en: '60°C', ar: '60°م' },
    footerNote: {
      en: 'Sour bath and rust treatment — Program No. 11',
      ar: 'حمام ساور و معالجة الصدأ — برنامج رقم 11',
    },
    steps: [
      { step: 1, process: { en: 'First rinse', ar: 'شطفة أولى' }, waterLevel: '2', temperature: cold },
      { step: 2, process: { en: 'Sour', ar: 'ساور' }, waterLevel: '1', temperature: { en: '60', ar: '60' } },
      { step: 3, process: { en: 'Final rinse', ar: 'شطفة أخيرة' }, waterLevel: '2', temperature: cold },
      { step: 4, process: { en: 'Final spin', ar: 'عصرة أخيرة' }, waterLevel: '-', temperature: dash },
    ],
  },
  {
    id: 12,
    title: { en: 'Rinse Only', ar: 'غسيل بدون كيماويات' },
    durationMin: 25,
    temperatureBadge: { en: '60°C', ar: '60°م' },
    footerNote: {
      en: 'Wash without chemicals — Program No. 12',
      ar: 'غسيل بدون كيماويات — برنامج رقم 12',
    },
    steps: [
      { step: 1, process: { en: 'First rinse', ar: 'شطفة أولى' }, waterLevel: '2', temperature: cold },
      {
        step: 2,
        process: { en: 'Wash without chemicals', ar: 'غسلة بدون كيمياء' },
        waterLevel: '1',
        temperature: { en: '60', ar: '60' },
      },
      { step: 3, process: { en: 'Final rinse', ar: 'شطفة أخيرة' }, waterLevel: '2', temperature: cold },
      { step: 4, process: { en: 'Final spin', ar: 'عصرة أخيرة' }, waterLevel: '-', temperature: dash },
    ],
  },
  {
    id: 13,
    title: { en: 'Light Colors', ar: 'ألوان فاتحة' },
    durationMin: 25,
    temperatureBadge: { en: '40°C', ar: '40°م' },
    footerNote: {
      en: 'Light wash — Program No. 13',
      ar: 'غسلة خفيفة — برنامج رقم 13',
    },
    steps: [
      { step: 1, process: { en: 'First rinse', ar: 'شطفة أولى' }, waterLevel: '2', temperature: cold },
      { step: 2, process: { en: 'Wash 1', ar: 'غسيل 1' }, waterLevel: '1', temperature: { en: '40', ar: '40' } },
      { step: 3, process: { en: 'First rinse', ar: 'شطفة أولى' }, waterLevel: '2', temperature: cold },
      { step: 7, process: { en: 'Soft', ar: 'سوفت' }, waterLevel: '1', temperature: cold },
      { step: 8, process: { en: 'Final spin', ar: 'عصرة أخيرة' }, waterLevel: '-', temperature: dash },
    ],
  },
] as const;

import { laundryChemicals, type LaundryChemical } from '@/data/laundry-chemicals';
import { requireSupabase } from '@/lib/data-store/create-relational-catalog-store';
import type { Json } from '@/lib/supabase/types';

type ChemicalRow = {
  id: number;
  product_code: string;
  brand: string;
  image: string;
  name_en: string;
  name_ar: string;
  category_en: string;
  category_ar: string;
  description_en: string;
  description_ar: string;
  how_it_works_en: string;
  how_it_works_ar: string;
  usage_en: string;
  usage_ar: string;
  dosage_en: string;
  dosage_ar: string;
  safety_en: string;
  safety_ar: string;
  storage_en: string;
  storage_ar: string;
  technical_footer_en: string;
  technical_footer_ar: string;
  features: unknown;
  warnings: unknown;
  sort_order: number;
};

type TechnicalRow = {
  id: string;
  chemical_id: number;
  row_key: string;
  label_en: string;
  label_ar: string;
  value_en: string;
  value_ar: string;
  sort_order: number;
};

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function normalizeFeaturesWarnings(value: unknown): { en: string[]; ar: string[] } {
  if (!value || typeof value !== 'object') {
    return { en: [], ar: [] };
  }
  const record = value as { en?: unknown; ar?: unknown };
  return {
    en: normalizeStringList(record.en),
    ar: normalizeStringList(record.ar),
  };
}

function mapChemical(row: ChemicalRow, technicalRows: TechnicalRow[]): LaundryChemical {
  return {
    id: row.id,
    productCode: row.product_code,
    brand: row.brand,
    image: row.image,
    name: { en: row.name_en, ar: row.name_ar },
    category: { en: row.category_en, ar: row.category_ar },
    description: { en: row.description_en, ar: row.description_ar },
    howItWorks: { en: row.how_it_works_en, ar: row.how_it_works_ar },
    features: normalizeFeaturesWarnings(row.features),
    usage: { en: row.usage_en, ar: row.usage_ar },
    dosage: { en: row.dosage_en, ar: row.dosage_ar },
    warnings: normalizeFeaturesWarnings(row.warnings),
    safety: { en: row.safety_en, ar: row.safety_ar },
    storage: { en: row.storage_en, ar: row.storage_ar },
    technicalInfo: technicalRows
      .filter((entry) => entry.chemical_id === row.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((entry) => ({
        key: entry.row_key,
        label: { en: entry.label_en, ar: entry.label_ar },
        value: { en: entry.value_en, ar: entry.value_ar },
      })),
    technicalFooterNote: {
      en: row.technical_footer_en,
      ar: row.technical_footer_ar,
    },
  };
}

function toJsonList(value: { en: readonly string[]; ar: readonly string[] }): Json {
  return { en: [...value.en], ar: [...value.ar] };
}

function chemicalToRows(chemical: LaundryChemical, sortOrder: number) {
  return {
    chemical: {
      id: chemical.id,
      product_code: chemical.productCode,
      brand: chemical.brand,
      image: chemical.image,
      name_en: chemical.name.en,
      name_ar: chemical.name.ar,
      category_en: chemical.category.en,
      category_ar: chemical.category.ar,
      description_en: chemical.description.en,
      description_ar: chemical.description.ar,
      how_it_works_en: chemical.howItWorks.en,
      how_it_works_ar: chemical.howItWorks.ar,
      usage_en: chemical.usage.en,
      usage_ar: chemical.usage.ar,
      dosage_en: chemical.dosage.en,
      dosage_ar: chemical.dosage.ar,
      safety_en: chemical.safety.en,
      safety_ar: chemical.safety.ar,
      storage_en: chemical.storage.en,
      storage_ar: chemical.storage.ar,
      technical_footer_en: chemical.technicalFooterNote.en,
      technical_footer_ar: chemical.technicalFooterNote.ar,
      features: toJsonList(chemical.features),
      warnings: toJsonList(chemical.warnings),
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    },
    technical: chemical.technicalInfo.map((row, index) => ({
      chemical_id: chemical.id,
      row_key: row.key,
      label_en: row.label.en,
      label_ar: row.label.ar,
      value_en: row.value.en,
      value_ar: row.value.ar,
      sort_order: index,
    })),
  };
}

export function getChemicalsSeed(): LaundryChemical[] {
  return [...laundryChemicals];
}

export async function fetchAllChemicals(): Promise<LaundryChemical[]> {
  const client = requireSupabase();

  const [chemicalsResult, technicalResult] = await Promise.all([
    client.from('laundry_chemicals').select('*').order('sort_order').order('id'),
    client.from('chemical_technical_info').select('*').order('chemical_id').order('sort_order'),
  ]);

  if (chemicalsResult.error) {
    throw chemicalsResult.error;
  }
  if (technicalResult.error) {
    throw technicalResult.error;
  }

  const technicalRows = (technicalResult.data as TechnicalRow[]) ?? [];
  return (chemicalsResult.data ?? []).map((row) => mapChemical(row as ChemicalRow, technicalRows));
}

export async function replaceAllChemicals(chemicals: LaundryChemical[]): Promise<void> {
  const client = requireSupabase();
  const ids = chemicals.map((chemical) => chemical.id);

  if (ids.length === 0) {
    const { error: chemicalsError } = await client.from('laundry_chemicals').delete().gte('id', 0);
    if (chemicalsError) {
      throw chemicalsError;
    }
    return;
  }

  const { data: existingChemicals, error: existingError } = await client
    .from('laundry_chemicals')
    .select('id');
  if (existingError) {
    throw existingError;
  }

  const staleIds = (existingChemicals ?? [])
    .map((row) => row.id as number)
    .filter((id) => !ids.includes(id));

  if (staleIds.length > 0) {
    const { error: deleteError } = await client.from('laundry_chemicals').delete().in('id', staleIds);
    if (deleteError) {
      throw deleteError;
    }
  }

  for (let index = 0; index < chemicals.length; index += 1) {
    const chemical = chemicals[index];
    const rows = chemicalToRows(chemical, index);

    const { error: chemicalError } = await client.from('laundry_chemicals').upsert(rows.chemical);
    if (chemicalError) {
      throw chemicalError;
    }

    const { error: deleteTechnicalError } = await client
      .from('chemical_technical_info')
      .delete()
      .eq('chemical_id', chemical.id);
    if (deleteTechnicalError) {
      throw deleteTechnicalError;
    }

    if (rows.technical.length > 0) {
      const { error: technicalError } = await client.from('chemical_technical_info').insert(rows.technical);
      if (technicalError) {
        throw technicalError;
      }
    }
  }
}

export const CHEMICALS_REALTIME_TABLES = ['laundry_chemicals', 'chemical_technical_info'] as const;

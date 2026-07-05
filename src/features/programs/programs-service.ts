import { washingPrograms, type WashingProgram } from '@/data/washing-programs';
import { requireSupabase } from '@/lib/data-store/create-relational-catalog-store';

type ProgramRow = {
  id: number;
  title_en: string;
  title_ar: string;
  sort_order: number;
};

type ProgramParamsRow = {
  program_id: number;
  duration_min: number;
  temp_badge_en: string;
  temp_badge_ar: string;
  footer_en: string;
  footer_ar: string;
};

type ProgramStepRow = {
  id: string;
  program_id: number;
  step_number: number;
  process_en: string;
  process_ar: string;
  water_level: string;
  temperature_en: string;
  temperature_ar: string;
  sort_order: number;
};

function mapProgram(
  row: ProgramRow,
  params: ProgramParamsRow | undefined,
  steps: ProgramStepRow[],
): WashingProgram {
  return {
    id: row.id,
    title: { en: row.title_en, ar: row.title_ar },
    durationMin: params?.duration_min ?? 0,
    temperatureBadge: {
      en: params?.temp_badge_en ?? '',
      ar: params?.temp_badge_ar ?? '',
    },
    footerNote: {
      en: params?.footer_en ?? '',
      ar: params?.footer_ar ?? '',
    },
    steps: steps
      .filter((step) => step.program_id === row.id)
      .sort((a, b) => a.step_number - b.step_number)
      .map((step) => ({
        step: step.step_number,
        process: { en: step.process_en, ar: step.process_ar },
        waterLevel: step.water_level,
        temperature: { en: step.temperature_en, ar: step.temperature_ar },
      })),
  };
}

function programToRows(program: WashingProgram, sortOrder: number) {
  return {
    program: {
      id: program.id,
      title_en: program.title.en,
      title_ar: program.title.ar,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    },
    params: {
      program_id: program.id,
      duration_min: program.durationMin,
      temp_badge_en: program.temperatureBadge.en,
      temp_badge_ar: program.temperatureBadge.ar,
      footer_en: program.footerNote.en,
      footer_ar: program.footerNote.ar,
      updated_at: new Date().toISOString(),
    },
    steps: program.steps.map((step, index) => ({
      program_id: program.id,
      step_number: step.step,
      process_en: step.process.en,
      process_ar: step.process.ar,
      water_level: step.waterLevel,
      temperature_en: step.temperature.en,
      temperature_ar: step.temperature.ar,
      sort_order: index,
    })),
  };
}

export function getProgramsSeed(): WashingProgram[] {
  return [...washingPrograms];
}

export async function fetchAllPrograms(): Promise<WashingProgram[]> {
  const client = requireSupabase();

  const [programsResult, paramsResult, stepsResult] = await Promise.all([
    client.from('washing_programs').select('id, title_en, title_ar, sort_order').order('sort_order').order('id'),
    client.from('washing_program_parameters').select('*'),
    client
      .from('washing_program_steps')
      .select('*')
      .order('program_id')
      .order('step_number'),
  ]);

  if (programsResult.error) {
    throw programsResult.error;
  }
  if (paramsResult.error) {
    throw paramsResult.error;
  }
  if (stepsResult.error) {
    throw stepsResult.error;
  }

  const paramsByProgram = new Map(
    (paramsResult.data as ProgramParamsRow[]).map((row) => [row.program_id, row]),
  );
  const steps = (stepsResult.data as ProgramStepRow[]) ?? [];

  return ((programsResult.data as ProgramRow[]) ?? []).map((row) =>
    mapProgram(row, paramsByProgram.get(row.id), steps),
  );
}

export async function replaceAllPrograms(programs: WashingProgram[]): Promise<void> {
  const client = requireSupabase();
  const ids = programs.map((program) => program.id);

  if (ids.length === 0) {
    const { error: programsError } = await client.from('washing_programs').delete().gte('id', 0);
    if (programsError) {
      throw programsError;
    }
    return;
  }

  const { data: existingPrograms, error: existingError } = await client
    .from('washing_programs')
    .select('id');
  if (existingError) {
    throw existingError;
  }

  const staleIds = (existingPrograms ?? [])
    .map((row) => row.id as number)
    .filter((id) => !ids.includes(id));

  if (staleIds.length > 0) {
    const { error: deleteError } = await client.from('washing_programs').delete().in('id', staleIds);
    if (deleteError) {
      throw deleteError;
    }
  }

  for (let index = 0; index < programs.length; index += 1) {
    const program = programs[index];
    const rows = programToRows(program, index);

    const { error: programError } = await client.from('washing_programs').upsert(rows.program);
    if (programError) {
      throw programError;
    }

    const { error: paramsError } = await client.from('washing_program_parameters').upsert(rows.params);
    if (paramsError) {
      throw paramsError;
    }

    const { error: deleteStepsError } = await client
      .from('washing_program_steps')
      .delete()
      .eq('program_id', program.id);
    if (deleteStepsError) {
      throw deleteStepsError;
    }

    if (rows.steps.length > 0) {
      const { error: stepsError } = await client.from('washing_program_steps').insert(rows.steps);
      if (stepsError) {
        throw stepsError;
      }
    }
  }
}

export const PROGRAMS_REALTIME_TABLES = [
  'washing_programs',
  'washing_program_parameters',
  'washing_program_steps',
] as const;

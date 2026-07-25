import { getSupabaseClient } from '@/lib/supabase/client';
import type { Database, Json } from '@/lib/supabase/types';
import type { SupabaseClient } from '@supabase/supabase-js';

export function requireSupabase(): SupabaseClient<Database> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured');
  }
  return client;
}

export function asJson(value: Record<string, unknown> | unknown): Json {
  return value as Json;
}

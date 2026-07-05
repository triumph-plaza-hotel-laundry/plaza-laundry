import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase/config';
import type { Database } from '@/lib/supabase/types';

let supabaseClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!supabaseConfig.isConfigured) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient<Database>(
      supabaseConfig.url,
      supabaseConfig.anonKey,
    );
  }

  return supabaseClient;
}

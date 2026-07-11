const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ??
  (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined);
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  (typeof process !== 'undefined'
    ? process.env.VITE_SUPABASE_ANON_KEY
    : undefined);

export const supabaseConfig = {
  url: supabaseUrl ?? '',
  anonKey: supabaseAnonKey ?? '',
  isConfigured: Boolean(supabaseUrl && supabaseAnonKey),
} as const;

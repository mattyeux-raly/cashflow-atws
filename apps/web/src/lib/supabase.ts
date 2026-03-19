import { createClient } from '@supabase/supabase-js';
import type { Database } from '@cashflow/shared';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// REQUIREMENT: Graceful handling when env vars are missing (dev mode without Supabase)
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// SECURITY: Use Supabase Auth for session management — no localStorage tokens
// In dev without config, use placeholder URL to avoid crash — all calls will fail gracefully
export const supabase = createClient<Database>(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  },
);

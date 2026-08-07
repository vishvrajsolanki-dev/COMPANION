import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Phase B — Supabase client. The app stays fully local-first: this is only
// reachable when the two env vars are present, and even then it's used just for
// access-key activation (Phase D adds sync). Without env vars the client is
// null and the whole feature is inert — existing local-only behavior is intact.
const url     = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True only when a real Supabase project is wired up via env vars. */
export const supabaseConfigured = Boolean(url && anonKey);

/** Lazy client — null when unconfigured so callers can short-circuit. */
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, anonKey!)
  : null;

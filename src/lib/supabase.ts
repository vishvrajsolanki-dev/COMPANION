import type { SupabaseClient } from '@supabase/supabase-js';

const url     = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True only when a real Supabase project is wired up via env vars. */
export const supabaseConfigured = Boolean(url && anonKey);

let cachedClient: SupabaseClient | null = null;
let clientPromise: Promise<SupabaseClient | null> | null = null;

/**
 * Lazy client getter — dynamically loads `@supabase/supabase-js` on demand.
 * This removes Supabase from the initial landing critical path.
 */
export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured) return null;
  if (cachedClient) return cachedClient;

  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) => {
        cachedClient = createClient(url!, anonKey!);
        return cachedClient;
      })
      .catch(err => {
        console.error('Failed to load Supabase client:', err);
        clientPromise = null;
        return null;
      });
  }

  return clientPromise;
}

/** Synchronous getter returning cached client if already initialized. */
export function getSupabaseSync(): SupabaseClient | null {
  return cachedClient;
}

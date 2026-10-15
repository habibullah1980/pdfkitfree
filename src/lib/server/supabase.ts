import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Cache client instances
let supabaseBrowserClient: SupabaseClient | null = null;
let supabaseServerClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)
  );
}

/**
 * Public/Browser Supabase Client
 * Uses Anon Key (Safe for client-side bundle, subject to Row Level Security)
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === 'undefined') {
    return null;
  }
  if (supabaseBrowserClient) return supabaseBrowserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  supabaseBrowserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return supabaseBrowserClient;
}

/**
 * Server-side Supabase Client for Authenticated Requests
 * Uses Anon Key with user authorization token
 */
export function getSupabaseServerClient(token?: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  if (token) {
    return createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  }

  if (!supabaseServerClient) {
    supabaseServerClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseServerClient;
}

/**
 * Server-only Admin Client
 * Uses SUPABASE_SERVICE_ROLE_KEY (Bypasses RLS, NEVER exposed to browser)
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseAdminClient;
}

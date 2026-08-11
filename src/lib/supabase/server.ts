import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  return url;
}

function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  return key;
}

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return key;
}

/**
 * Auth-aware server client using @supabase/ssr with cookie adapter.
 * Uses the anon key so RLS policies are enforced.
 * Must be awaited since cookies() is async in Next.js 16.
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createSSRServerClient(
    getSupabaseUrl(),
    getAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can fail in Server Components where response is read-only.
            // This is fine — the middleware handles token refresh.
          }
        },
      },
    }
  );
}

/**
 * Admin client bypassing RLS using the service role key.
 * Use for admin routes, cron jobs, and storage uploads.
 */
export function createAdminClient() {
  return createClient(
    getSupabaseUrl(),
    getServiceRoleKey()
  );
}

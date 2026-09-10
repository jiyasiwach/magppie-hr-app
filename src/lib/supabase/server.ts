import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * The server client, for route handlers and server components.
 *
 * Still the anon key and still the user's session — row-level security applies
 * here exactly as it does in the browser. Being on the server is not a reason
 * to trust the caller more.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase is not configured. See .env.example.');
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component, where cookies cannot be set.
          // The middleware refreshes the session instead.
        }
      },
    },
  });
}

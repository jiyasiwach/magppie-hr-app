'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * The browser client.
 *
 * It carries the signed-in user's session, so every query it makes is subject
 * to row-level security. There is no service-role key anywhere in this app —
 * if a query returns nothing, the correct answer is that the policy said no,
 * not that we should reach for a key that bypasses it.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  return createBrowserClient(url, key);
}

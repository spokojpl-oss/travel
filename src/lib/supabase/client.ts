import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

function getPublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Brak NEXT_PUBLIC_SUPABASE_URL lub NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Ustaw je na Vercel i zrób redeploy.",
    );
  }

  return { url, anonKey };
}

export function createClient() {
  const { url, anonKey } = getPublicEnv();
  return createBrowserClient<Database>(url, anonKey);
}

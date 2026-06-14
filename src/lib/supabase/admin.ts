import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/config/env";
import { serverEnv } from "@/config/server-env";
import type { Database } from "@/types/database";

// UŻYWAĆ TYLKO W SERVER-SIDE KODZIE
// Omija RLS - daje pełny dostęp do bazy
export function createAdminClient() {
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

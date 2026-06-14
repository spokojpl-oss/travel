import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export type SearchType =
  | "activities"
  | "destination_build"
  | "flights"
  | "hotels"
  | "transport";

export async function logSearch({
  userId,
  searchType,
  params,
  resultSummary,
}: {
  userId: string;
  searchType: SearchType;
  params: Record<string, unknown>;
  resultSummary?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("search_history").insert({
      user_id: userId,
      search_type: searchType,
      params: params as Json,
      result_summary: (resultSummary ?? {}) as Json,
    });
  } catch (e) {
    console.error("Failed to log search:", e);
  }
}

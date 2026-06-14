import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const REQUIRED_TABLES = [
  "user_profiles",
  "travel_groups",
  "group_members",
  "group_preferences",
  "destinations",
  "attractions",
  "api_cache",
  "weather_cache",
  "scrape_locks",
] as const;

export async function GET() {
  const checks: Record<string, { ok: boolean; message?: string }> = {};

  try {
    await import("@/config/env");
    await import("@/config/server-env");
    checks.env = { ok: true };
  } catch {
    checks.env = { ok: false, message: "Missing env variables" };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("user_profiles").select("id").limit(1);
    checks.supabase = {
      ok: !error,
      message: error?.message,
    };

    checks.tables = { ok: true };
    for (const table of REQUIRED_TABLES) {
      const { error: tableError } = await supabase.from(table).select("*").limit(0);

      if (tableError && tableError.code !== "PGRST116") {
        checks.tables = {
          ok: false,
          message: `Table ${table}: ${tableError.message}`,
        };
        break;
      }
    }
  } catch (e) {
    checks.supabase = {
      ok: false,
      message: e instanceof Error ? e.message : "Unknown error",
    };
    checks.tables = { ok: false, message: "Supabase check failed" };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      status: allOk ? "ok" : "error",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 500 },
  );
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const { error } = await supabase.from("_health").select("*").limit(1);
    checks.supabase = {
      ok: error?.code === "42P01" || !error,
      message: error?.message,
    };
  } catch (e) {
    checks.supabase = {
      ok: false,
      message: e instanceof Error ? e.message : "Unknown error",
    };
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

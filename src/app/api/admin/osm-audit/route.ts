import { NextResponse } from "next/server";
import { buildOsmCoverageReport } from "@/lib/api/osm-coverage-audit";
import { createClient } from "@/lib/supabase/server";
import { getAdminEmails, isAdminEmail } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        hint:
          getAdminEmails().length === 0
            ? "Ustaw ADMIN_EMAILS na Vercel."
            : `Zaloguj się jako: ${getAdminEmails().join(", ")}`,
      },
      { status: 403 },
    );
  }

  try {
    const report = await buildOsmCoverageReport();
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Audit failed",
      },
      { status: 500 },
    );
  }
}

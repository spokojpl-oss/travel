import { NextResponse } from "next/server";
import {
  performGlobalOsmScrape,
  tagAttractionsWithActivities,
} from "@/lib/api/osm-global-scrape";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminEmails = getAdminEmails();
  if (
    !user ||
    adminEmails.length === 0 ||
    !adminEmails.includes((user.email ?? "").toLowerCase())
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const bboxFilter = searchParams.get("bbox")?.split(",").map((s) => s.trim());
  const skipScrape = searchParams.get("skipScrape") === "true";
  const skipTagging = searchParams.get("skipTagging") === "true";

  const results: Record<string, unknown> = {};

  if (!skipScrape) {
    results.scrape = await performGlobalOsmScrape({
      bboxFilter,
      delayBetweenRequestsMs: 2000,
    });
  }

  if (!skipTagging) {
    results.tagging = await tagAttractionsWithActivities();
  }

  return NextResponse.json({ success: true, results });
}

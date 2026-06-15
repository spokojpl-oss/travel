import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { agentLog } from "@/lib/debug/agent-log";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();

    const [
      { count: activitiesCount },
      { count: attractionsCount },
      { count: tagsCount },
    ] = await Promise.all([
      admin.from("activities").select("*", { count: "exact", head: true }),
      admin.from("attractions").select("*", { count: "exact", head: true }),
      admin
        .from("attraction_activity_tags")
        .select("*", { count: "exact", head: true }),
    ]);

    const activities = activitiesCount ?? 0;
    const attractions = attractionsCount ?? 0;
    const tags = tagsCount ?? 0;

    const { data: tagSample } = await admin
      .from("attraction_activity_tags")
      .select("activity_slug")
      .limit(5000);

    const tagCounts: Record<string, number> = {};
    for (const row of tagSample ?? []) {
      tagCounts[row.activity_slug] = (tagCounts[row.activity_slug] ?? 0) + 1;
    }

    agentLog(
      "activities/status/route.ts:GET",
      "db tag distribution sample",
      {
        activities,
        attractions,
        tags,
        tag_counts_sample: tagCounts,
        unique_activity_slugs: Object.keys(tagCounts).length,
      },
      "H1",
    );

    return NextResponse.json({
      activities,
      attractions,
      tags,
      search_ready: tags > 0,
      taxonomy_ready: activities > 0,
      message:
        tags === 0
          ? attractions === 0
            ? "Brak atrakcji w bazie — uruchom initial-scrape (OSM)."
            : "Atrakcje są, ale brak tagów aktywności — uruchom tagging."
          : null,
    });
  } catch (e) {
    return NextResponse.json(
      {
        activities: 0,
        attractions: 0,
        tags: 0,
        search_ready: false,
        taxonomy_ready: false,
        message: e instanceof Error ? e.message : "Status check failed",
      },
      { status: 500 },
    );
  }
}

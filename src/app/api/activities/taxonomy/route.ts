import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_TAXONOMY,
  sortTaxonomy,
} from "@/lib/activities/default-taxonomy";
import type { Activity, ActivityGroupWithActivities } from "@/types/domain";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: groups, error } = await supabase
    .from("activity_groups")
    .select("*, activities (*)")
    .order("sort_order");

  if (error) {
    return NextResponse.json(
      {
        groups: sortTaxonomy(DEFAULT_TAXONOMY),
        meta: {
          source: "fallback",
          db_error: error.message,
        },
      },
      { status: 200 },
    );
  }

  const fromDb = (groups ?? []).map((g) => ({
    ...g,
    activities: ((g.activities as Activity[]) ?? []).sort(
      (a, b) => a.sort_order - b.sort_order,
    ),
  })) as ActivityGroupWithActivities[];

  const hasActivities = fromDb.some((g) => g.activities.length > 0);

  if (!hasActivities) {
    return NextResponse.json({
      groups: sortTaxonomy(DEFAULT_TAXONOMY),
      meta: {
        source: "fallback",
        reason: "empty_database",
      },
    });
  }

  return NextResponse.json({
    groups: sortTaxonomy(fromDb),
    meta: { source: "database" },
  });
}

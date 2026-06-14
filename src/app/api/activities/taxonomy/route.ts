import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Activity } from "@/types/domain";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: groups } = await supabase
    .from("activity_groups")
    .select("*, activities (*)")
    .order("sort_order");

  if (!groups) {
    return NextResponse.json({ groups: [] });
  }

  const sorted = groups.map((g) => ({
    ...g,
    activities: (g.activities as Activity[]).sort(
      (a, b) => a.sort_order - b.sort_order,
    ),
  }));

  return NextResponse.json({ groups: sorted });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAttractionDetail } from "@/lib/api/attraction-detail-fetch";
import { wikipediaSearchUrl } from "@/lib/plan/attraction-detail-text";
import type { AttractionWithActivities } from "@/types/domain";
import type { Locale } from "@/i18n/config";

const bodySchema = z.object({
  id: z.string().uuid(),
  locale: z.enum(["pl", "en"]).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const locale: Locale = parsed.data.locale ?? "pl";
  const pl = locale !== "en";

  const { data: row, error } = await supabase
    .from("attractions")
    .select(
      "id, name, description, category, subcategories, lat, lon, address, phone, website, opening_hours, tags, min_age, duration_minutes, source, external_id",
    )
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Attraction not found" }, { status: 404 });
  }

  const { data: tagRows } = await supabase
    .from("attraction_activity_tags")
    .select("activity_slug, confidence")
    .eq("attraction_id", row.id);

  const attraction = {
    ...row,
    activity_tags: tagRows ?? [],
  } as AttractionWithActivities;

  const result = await resolveAttractionDetail(attraction, locale);

  if (
    result.overview &&
    (result.source === "wikipedia" || result.source === "google") &&
    !row.description?.trim()
  ) {
    try {
      const admin = createAdminClient();
      await admin
        .from("attractions")
        .update({ description: result.overview })
        .eq("id", row.id);
    } catch {
      /* zapis opisu opcjonalny */
    }
  }

  if (result.overview) {
    return NextResponse.json(result);
  }

  return NextResponse.json({
    ...result,
    message: pl
      ? "Nie mamy opisu tego miejsca — to punkt z mapy OpenStreetMap bez artykułu w bazie. Możesz sprawdzić Wikipedię lub stronę obiektu."
      : "We don't have a description — this is an OpenStreetMap point without a write-up in our database. Try Wikipedia or the venue website.",
    wikipediaSearchUrl: wikipediaSearchUrl(row.name, locale),
  });
}

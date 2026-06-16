import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resolveRegionDetail } from "@/lib/api/region-detail-fetch";
import { loadTouristRegionsCatalog } from "@/lib/destinations/tourist-regions-store";
import type { Locale } from "@/i18n/config";

const bodySchema = z.object({
  regionId: z.string(),
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
  const catalog = await loadTouristRegionsCatalog();
  const region = catalog.find((r) => r.id === parsed.data.regionId);
  if (!region) {
    return NextResponse.json({ error: "Region not found" }, { status: 404 });
  }

  const name = locale === "en" ? region.name_en : region.name_pl;
  const overview = locale === "en" ? region.overview_en : region.overview_pl;

  const result = await resolveRegionDetail({
    name,
    overview,
    centerLat: region.center_lat,
    centerLon: region.center_lon,
    locale,
  });

  return NextResponse.json(result);
}

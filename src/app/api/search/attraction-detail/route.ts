import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchWikipediaPageSummary } from "@/lib/api/wikipedia-summary";
import {
  buildInlineAttractionDetail,
  isWeakAttractionDescription,
  wikipediaSearchTitle,
  wikipediaTargetFromOsmTags,
} from "@/lib/plan/attraction-detail-text";
import type { AttractionWithActivities } from "@/types/domain";
import type { Locale } from "@/i18n/config";

const bodySchema = z.object({
  id: z.string().uuid(),
  locale: z.enum(["pl", "en"]).optional(),
});

function asOsmTags(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value != null && String(value).trim()) out[key] = String(value).trim();
  }
  return out;
}

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

  const inline = buildInlineAttractionDetail(attraction, locale);
  if (inline.overview && !isWeakAttractionDescription(inline.overview)) {
    return NextResponse.json({
      overview: inline.overview,
      highlights: inline.highlights,
      source: row.source === "curated" ? "curated" : "inline",
    });
  }

  const tags = asOsmTags(row.tags);
  const wikiFromTag = wikipediaTargetFromOsmTags(tags, locale);

  const wikiCandidates: Array<{ page: string; wikiLocale: Locale }> = [];
  if (wikiFromTag) wikiCandidates.push(wikiFromTag);
  wikiCandidates.push({
    page: wikipediaSearchTitle(row.name),
    wikiLocale: locale,
  });
  if (locale === "pl") {
    wikiCandidates.push({
      page: wikipediaSearchTitle(row.name),
      wikiLocale: "en",
    });
  }

  const seen = new Set<string>();
  for (const candidate of wikiCandidates) {
    const key = `${candidate.wikiLocale}:${candidate.page}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const wiki = await fetchWikipediaPageSummary(
      candidate.page,
      candidate.wikiLocale,
      4000,
    );
    if (wiki?.extract) {
      return NextResponse.json({
        overview: wiki.extract,
        highlights: inline.highlights,
        source: "wikipedia",
      });
    }
  }

  if (inline.overview) {
    return NextResponse.json({
      overview: inline.overview,
      highlights: inline.highlights,
      source: "inline",
    });
  }

  const pl = locale !== "en";
  return NextResponse.json({
    overview: pl
      ? "Mało danych w OpenStreetMap — to może być niewielki obiekt lub ruina bez opisu. Sprawdź lokalizację na mapie albo stronę www, jeśli jest podana."
      : "Little data in OpenStreetMap — this may be a minor site or ruin without a description. Check the map location or website if listed.",
    highlights: inline.highlights,
    source: "none",
  });
}

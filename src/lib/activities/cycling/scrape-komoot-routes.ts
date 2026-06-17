import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchKomootTourCoordinates,
  fetchKomootTourSummary,
  komootTourToActivityRouteInsert,
} from "@/lib/activities/cycling/komoot-client";
import { maxDistanceFromPointM } from "@/lib/activities/cycling/route-validation";

const SITEMAP_CHUNKS = [
  "https://static.komoot.de/web/sitemaps/en/sitemap-00.xml.gz",
  "https://static.komoot.de/web/sitemaps/en/sitemap-01.xml.gz",
  "https://static.komoot.de/web/sitemaps/en/sitemap-02.xml.gz",
  "https://static.komoot.de/web/sitemaps/pl-pl/sitemap-00.xml.gz",
  "https://static.komoot.de/web/sitemaps/el-gr/sitemap-00.xml.gz",
];

const SMART_TOUR_ID_RE = /smarttour\/e(\d+)/gi;

function haversineM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function keywordsFromLabel(label: string): string[] {
  const base = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[,;/|]+/)
    .flatMap((part) => part.trim().split(/\s+/))
    .map((w) => w.replace(/[^a-z0-9-]/g, ""))
    .filter((w) => w.length >= 4);

  return [...new Set(base)].slice(0, 8);
}

async function discoverTourIdsFromSitemaps(
  keywords: string[],
  maxIds = 60,
): Promise<string[]> {
  if (keywords.length === 0) return [];

  const ids = new Set<string>();

  for (const chunkUrl of SITEMAP_CHUNKS) {
    if (ids.size >= maxIds) break;
    try {
      const res = await fetch(chunkUrl, { next: { revalidate: 86400 } });
      if (!res.ok) continue;

      const buffer = await res.arrayBuffer();
      const { gunzipSync } = await import("node:zlib");
      const xml = gunzipSync(Buffer.from(buffer)).toString("utf8");

      for (const line of xml.split("\n")) {
        if (!line.includes("smarttour/e")) continue;
        const slug = line.toLowerCase();
        if (!keywords.some((kw) => slug.includes(kw))) continue;

        SMART_TOUR_ID_RE.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = SMART_TOUR_ID_RE.exec(line)) !== null) {
          ids.add(match[1]!);
          if (ids.size >= maxIds) break;
        }
        if (ids.size >= maxIds) break;
      }
    } catch {
      continue;
    }
  }

  return [...ids];
}

export async function scrapeKomootCyclingRoutesForDestination(
  destinationId: string,
  options: {
    centerLat: number;
    centerLon: number;
    radiusKm: number;
    destinationLabel?: string;
    maxTours?: number;
  },
): Promise<{ persisted: number; skipped: number }> {
  const supabase = createAdminClient();
  const maxTours = options.maxTours ?? 15;
  const radiusM = options.radiusKm * 1000;

  const keywords = keywordsFromLabel(options.destinationLabel ?? "");
  let candidateIds = await discoverTourIdsFromSitemaps(keywords, 80);

  if (candidateIds.length === 0) {
    candidateIds = await discoverTourIdsFromSitemaps(
      ["cycling", "bike", "gravel", "mtb"],
      40,
    );
  }

  let persisted = 0;
  let skipped = 0;
  let checked = 0;

  for (const tourId of candidateIds) {
    if (persisted >= maxTours) break;
    if (checked >= 50) break;
    checked++;

    const summary = await fetchKomootTourSummary(tourId);
    if (!summary) {
      skipped++;
      continue;
    }

    const dist = haversineM(
      options.centerLat,
      options.centerLon,
      summary.start_lat,
      summary.start_lng,
    );
    if (dist > radiusM) {
      skipped++;
      continue;
    }

    const coordinates = await fetchKomootTourCoordinates(tourId);
    const row = komootTourToActivityRouteInsert(
      destinationId,
      summary,
      coordinates,
    );
    if (!row) {
      skipped++;
      continue;
    }

    const path = coordinates.map((c) => ({ lat: c.lat, lng: c.lng }));
    const maxFromCenter = maxDistanceFromPointM(
      path.map((p) => [p.lng, p.lat]),
      options.centerLat,
      options.centerLon,
    );
    if (maxFromCenter > radiusM + 5000) {
      skipped++;
      continue;
    }

    const { error } = await supabase.from("activity_routes").upsert(row, {
      onConflict: "destination_id,source_external_id",
    });

    if (error) {
      skipped++;
      continue;
    }

    persisted++;
  }

  return { persisted, skipped };
}

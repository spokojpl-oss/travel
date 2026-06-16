import { createAdminClient } from "@/lib/supabase/admin";
import {
  bboxFromCenter,
  EUROPE_SCRAPE_REGIONS,
  regionForPoint,
  SCRAPE_REGIONS,
} from "@/lib/api/osm-scrape-regions";
import { DESTINATION_CATALOG } from "@/lib/destinations/catalog";
import type { BoundingBox } from "@/types/domain";

const DESTINATION_RADIUS_KM = 55;
export const SPARSE_REGION_THRESHOLD = 80;
export const EMPTY_DESTINATION_THRESHOLD = 15;

export type BboxStats = {
  attractions: number;
  taggedAttractions: number;
  tags: number;
};

export type DestinationCoverage = {
  name: string;
  country: string;
  region: string | null;
  attractions: number;
  tags: number;
  status: "ok" | "sparse" | "empty" | "untagged";
};

export type RegionCoverage = {
  name: string;
  attractions: number;
  taggedAttractions: number;
  tags: number;
  needsScrape: boolean;
};

export type OsmCoverageReport = {
  totals: { attractions: number; tags: number };
  destinations: DestinationCoverage[];
  europeRegions: RegionCoverage[];
  emptyDestinations: string[];
  regionsNeedingScrape: string[];
};

function destinationBbox(
  lat: number,
  lon: number,
  islandBbox?: BoundingBox,
): BoundingBox {
  return islandBbox ?? bboxFromCenter(lat, lon, DESTINATION_RADIUS_KM);
}

export async function countInBbox(bbox: BoundingBox): Promise<BboxStats> {
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("attractions")
    .select("id")
    .gte("lat", bbox.south)
    .lte("lat", bbox.north)
    .gte("lon", bbox.west)
    .lte("lon", bbox.east);

  if (error) throw new Error(error.message);

  const ids = rows?.map((r) => r.id) ?? [];
  if (ids.length === 0) {
    return { attractions: 0, taggedAttractions: 0, tags: 0 };
  }

  let tags = 0;
  const taggedIds = new Set<string>();

  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data: tagRows, error: tagError } = await admin
      .from("attraction_activity_tags")
      .select("attraction_id")
      .in("attraction_id", chunk);

    if (tagError) throw new Error(tagError.message);

    for (const row of tagRows ?? []) {
      tags++;
      taggedIds.add(row.attraction_id);
    }
  }

  return {
    attractions: ids.length,
    taggedAttractions: taggedIds.size,
    tags,
  };
}

function classifyDestination(
  attractions: number,
  tags: number,
): DestinationCoverage["status"] {
  if (attractions === 0) return "empty";
  if (tags === 0) return "untagged";
  if (attractions < EMPTY_DESTINATION_THRESHOLD) return "sparse";
  return "ok";
}

export async function buildOsmCoverageReport(): Promise<OsmCoverageReport> {
  const admin = createAdminClient();

  const [{ count: totalAttractions }, { count: totalTags }] = await Promise.all([
    admin.from("attractions").select("*", { count: "exact", head: true }),
    admin
      .from("attraction_activity_tags")
      .select("*", { count: "exact", head: true }),
  ]);

  const destinations: DestinationCoverage[] = [];

  for (const dest of DESTINATION_CATALOG) {
    if (dest.lat == null || dest.lon == null) continue;

    const bbox = destinationBbox(dest.lat, dest.lon, dest.islandBbox);
    const stats = await countInBbox(bbox);
    destinations.push({
      name: dest.name,
      country: dest.country,
      region: regionForPoint(dest.lat, dest.lon),
      attractions: stats.attractions,
      tags: stats.tags,
      status: classifyDestination(stats.attractions, stats.tags),
    });
  }

  destinations.sort((a, b) => {
    const order = { empty: 0, untagged: 1, sparse: 2, ok: 3 };
    if (order[a.status] !== order[b.status]) {
      return order[a.status] - order[b.status];
    }
    return a.attractions - b.attractions;
  });

  const europeRegions: RegionCoverage[] = [];

  for (const name of EUROPE_SCRAPE_REGIONS) {
    const region = SCRAPE_REGIONS.find((r) => r.name === name);
    if (!region) continue;
    const stats = await countInBbox(region.bbox);
    europeRegions.push({
      name,
      attractions: stats.attractions,
      taggedAttractions: stats.taggedAttractions,
      tags: stats.tags,
      needsScrape: stats.attractions < SPARSE_REGION_THRESHOLD,
    });
  }

  europeRegions.sort((a, b) => a.attractions - b.attractions);

  return {
    totals: {
      attractions: totalAttractions ?? 0,
      tags: totalTags ?? 0,
    },
    destinations,
    europeRegions,
    emptyDestinations: destinations
      .filter((d) => d.status === "empty")
      .map((d) => d.name),
    regionsNeedingScrape: europeRegions
      .filter((r) => r.needsScrape)
      .map((r) => r.name),
  };
}

export { EUROPE_SCRAPE_REGIONS };

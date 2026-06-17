import { fillDestinationAttractionsQuick } from "@/lib/api/destination-osm-fill";
import {
  countInBbox,
  EMPTY_DESTINATION_THRESHOLD,
} from "@/lib/api/osm-coverage-audit";
import { bboxFromCenter } from "@/lib/api/osm-scrape-regions";
import { loadTouristRegionsCatalog } from "@/lib/destinations/tourist-regions-store";
import {
  regionMapRadiusKm,
  type TouristRegion,
} from "@/lib/destinations/tourist-regions";
import type { BoundingBox } from "@/types/domain";

const DEFAULT_FILL_ACTIVITIES = [
  "sandy_beaches",
  "rocky_beaches",
  "viewpoints",
  "museums",
  "archaeology",
  "castles",
  "old_towns",
  "hiking_trails",
  "national_parks",
  "waterfalls",
  "caves",
  "boat_tour",
] as const;

const MOUNTAIN_FILL_ACTIVITIES = [
  "viewpoints",
  "hiking_trails",
  "national_parks",
  "waterfalls",
  "caves",
  "castles",
  "archaeology",
  "old_towns",
  "museums",
  "bike_rental",
  "mountain_biking",
] as const;

const HISTORIC_FILL_ACTIVITIES = [
  "viewpoints",
  "museums",
  "archaeology",
  "castles",
  "old_towns",
  "hiking_trails",
  "national_parks",
] as const;

const PORTUGAL_REGION_KEYS = new Set([
  "portugalia",
  "portugal",
  "algarve",
  "madeira",
  "madera",
  "azory",
  "azores",
  "lisbon",
  "lizbona",
  "lisboa",
  "porto",
  "funchal",
]);

/** Aktywności OSM dopasowane do charakteru regionu — bez plaż w górach. */
export function fillActivitySlugsForRegion(region: TouristRegion): string[] {
  const cycling =
    region.id.includes("cycling") ||
    region.id.startsWith("cy-") ||
    region.slug.includes("cycling");

  if (cycling || region.character === "wild") {
    return [...MOUNTAIN_FILL_ACTIVITIES];
  }
  if (region.character === "historic") {
    return [...HISTORIC_FILL_ACTIVITIES];
  }
  return [...DEFAULT_FILL_ACTIVITIES];
}

export function isPortugalTouristRegion(region: TouristRegion): boolean {
  return region.destination_keys.some((key) =>
    PORTUGAL_REGION_KEYS.has(key.toLowerCase()),
  );
}

export function filterTouristRegionsByCountry(
  regions: TouristRegionScrapeStatus[],
  country: string | null,
): TouristRegionScrapeStatus[] {
  if (!country || country === "all") return regions;
  if (country === "portugal") {
    return regions.filter((r) =>
      r.destination_keys.some((key) =>
        PORTUGAL_REGION_KEYS.has(key.toLowerCase()),
      ),
    );
  }
  return regions;
}

export type TouristRegionScrapeStatus = {
  id: string;
  name_pl: string;
  name_en: string;
  destination_keys: string[];
  radius_km: number;
  attractions: number;
  tags: number;
  needsScrape: boolean;
};

export type TouristRegionScrapeResult = {
  id: string;
  name_pl: string;
  persisted: number;
  tagged: number;
  attractionsBefore: number;
  attractionsAfter: number;
};

function regionBbox(region: TouristRegion): BoundingBox {
  const radiusKm = regionMapRadiusKm(region);
  return bboxFromCenter(region.center_lat, region.center_lon, radiusKm);
}

export async function listTouristRegionScrapeStatus(): Promise<
  TouristRegionScrapeStatus[]
> {
  const regions = await loadTouristRegionsCatalog();
  const rows: TouristRegionScrapeStatus[] = [];

  for (const region of regions) {
    const bbox = regionBbox(region);
    const stats = await countInBbox(bbox);
    rows.push({
      id: region.id,
      name_pl: region.name_pl,
      name_en: region.name_en,
      destination_keys: region.destination_keys,
      radius_km: regionMapRadiusKm(region),
      attractions: stats.attractions,
      tags: stats.tags,
      needsScrape: stats.attractions < EMPTY_DESTINATION_THRESHOLD,
    });
  }

  rows.sort((a, b) => a.attractions - b.attractions);
  return rows;
}

export async function scrapeTouristRegionOsm(
  regionId: string,
): Promise<TouristRegionScrapeResult> {
  const regions = await loadTouristRegionsCatalog();
  const region = regions.find((r) => r.id === regionId);
  if (!region) {
    throw new Error(`Nie znaleziono regionu turystycznego: ${regionId}`);
  }

  const bbox = regionBbox(region);
  const before = await countInBbox(bbox);
  const radiusKm = regionMapRadiusKm(region);

  const { persisted, tagged } = await fillDestinationAttractionsQuick({
    lat: region.center_lat,
    lon: region.center_lon,
    radiusKm,
    activitySlugs: fillActivitySlugsForRegion(region),
    searchBbox: bbox,
    forceRefresh: true,
  });

  const after = await countInBbox(bbox);

  return {
    id: region.id,
    name_pl: region.name_pl,
    persisted,
    tagged,
    attractionsBefore: before.attractions,
    attractionsAfter: after.attractions,
  };
}

import { fetchWithCache } from "@/lib/cache/api-cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BoundingBox } from "@/types/domain";
import type { Json } from "@/types/database";
import {
  isJunkOsmText,
  wikipediaTargetFromOsmTags,
} from "@/lib/plan/attraction-detail-text";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const OSM_QUERY_TEMPLATES = {
  bicycle_rental: `["amenity"="bicycle_rental"]`,
  car_rental: `["amenity"="car_rental"]`,
  tourism_attraction: `["tourism"="attraction"]`,
  cave: `["natural"="cave_entrance"]`,
  beach: `["natural"="beach"]`,
  viewpoint: `["tourism"="viewpoint"]`,
  museum: `["tourism"="museum"]`,
  zoo: `["tourism"="zoo"]`,
  aquarium: `["tourism"="aquarium"]`,
  theme_park: `["tourism"="theme_park"]`,
  hiking: `["sport"="hiking"]`,
  waterfall: `["waterway"="waterfall"]`,
  castle: `["historic"="castle"]`,
  archaeological_site: `["historic"="archaeological_site"]`,
} as const;

export type OsmCategory = keyof typeof OSM_QUERY_TEMPLATES;

type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OsmResponse = {
  elements: OsmElement[];
};

export type NormalizedOsmPlace = {
  external_id: string;
  name: string;
  category: OsmCategory;
  subcategories: string[];
  lat: number;
  lon: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  opening_hours: string | null;
  tags: Record<string, string>;
};

function overpassTimeoutSec(bbox: BoundingBox): number {
  const span =
    Math.abs(bbox.north - bbox.south) + Math.abs(bbox.east - bbox.west);
  if (span > 8) return 90;
  if (span > 4) return 60;
  return 45;
}

export async function fetchOsmPlaces({
  bbox,
  category,
  forceRefresh = false,
}: {
  bbox: BoundingBox;
  category: OsmCategory;
  forceRefresh?: boolean;
}): Promise<NormalizedOsmPlace[]> {
  const queryTag = OSM_QUERY_TEMPLATES[category];
  const timeoutSec = overpassTimeoutSec(bbox);

  const overpassQuery = `
    [out:json][timeout:${timeoutSec}];
    (
      node${queryTag}(${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      way${queryTag}(${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      relation${queryTag}(${bbox.south},${bbox.west},${bbox.north},${bbox.east});
    );
    out center tags;
  `;

  const { data } = await fetchWithCache<OsmResponse>({
    source: "osm",
    cacheParams: { bbox, category },
    ttlSeconds: 90 * 24 * 60 * 60,
    forceRefresh,
    fetcher: async () => {
      let lastError: Error | null = null;

      for (const endpoint of OVERPASS_ENDPOINTS) {
        for (let attempt = 0; attempt < 4; attempt++) {
          try {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: `data=${encodeURIComponent(overpassQuery)}`,
            });

            if (
              response.status === 429 ||
              response.status === 503 ||
              response.status === 504
            ) {
              await sleep(2500 * (attempt + 1));
              continue;
            }

            if (!response.ok) {
              throw new Error(
                `OSM Overpass error: ${response.status} ${response.statusText}`,
              );
            }

            return response.json() as Promise<OsmResponse>;
          } catch (error) {
            lastError =
              error instanceof Error ? error : new Error(String(error));
            if (attempt < 3) await sleep(1000 * (attempt + 1));
          }
        }
      }

      throw lastError ?? new Error("All Overpass endpoints failed");
    },
  });

  return data.elements
    .map((el) => normalizeOsmElement(el, category))
    .filter((p): p is NormalizedOsmPlace => p !== null);
}

function normalizeOsmElement(
  el: OsmElement,
  category: OsmCategory,
): NormalizedOsmPlace | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;

  if (lat === undefined || lon === undefined) return null;

  const tags = el.tags ?? {};
  const name =
    tags.name ??
    tags["name:en"] ??
    tags["name:pl"] ??
    (tags.tourism ? `${tags.tourism} (${el.id})` : null);

  if (!name) return null;

  const subcategories: string[] = [];
  if (tags.sport) subcategories.push(...tags.sport.split(";"));
  if (tags.tourism) subcategories.push(tags.tourism);
  if (tags.amenity) subcategories.push(tags.amenity);

  const addressParts = [
    tags["addr:street"],
    tags["addr:housenumber"],
    tags["addr:city"] ??
      tags["is_in:city"] ??
      tags["is_in:municipality"] ??
      tags["is_in:town"] ??
      tags["is_in:village"],
    tags["addr:postcode"],
  ].filter(Boolean);
  const address = addressParts.length > 0 ? addressParts.join(", ") : null;

  return {
    external_id: `osm:${el.type}:${el.id}`,
    name,
    category,
    subcategories: Array.from(new Set(subcategories)),
    lat,
    lon,
    address,
    phone: tags.phone ?? tags["contact:phone"] ?? null,
    website: tags.website ?? tags["contact:website"] ?? null,
    opening_hours: tags.opening_hours ?? null,
    tags,
  };
}

export async function persistOsmPlaces(
  places: NormalizedOsmPlace[],
  destinationId: string | null,
): Promise<{ upserted: number }> {
  const supabase = createAdminClient();

  if (places.length === 0) return { upserted: 0 };

  const rows = places.map((p) => {
    const desc =
      [p.tags["description:pl"], p.tags.description, p.tags["description:en"]]
        .map((v) => v?.trim())
        .find((v) => v && v.length >= 20 && !isJunkOsmText(v)) ?? null;

    return {
      external_id: p.external_id,
      source: "osm",
      destination_id: destinationId,
      name: p.name,
      description: desc,
      category: p.category,
    subcategories: p.subcategories,
    lat: p.lat,
    lon: p.lon,
    address: p.address,
    phone: p.phone,
    website: p.website,
    opening_hours: p.opening_hours,
    tags: p.tags as Json,
  }));

  const batchSize = 200;
  let upserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from("attractions").upsert(batch, {
      onConflict: "source,external_id",
    });

    if (error) {
      throw new Error(
        `Failed to persist OSM places (batch ${i / batchSize + 1}): ${error.message}`,
      );
    }

    upserted += batch.length;
  }

  return { upserted };
}

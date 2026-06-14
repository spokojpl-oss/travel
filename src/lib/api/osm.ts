import { fetchWithCache } from "@/lib/cache/api-cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BoundingBox } from "@/types/domain";
import type { Json } from "@/types/database";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

const OSM_QUERY_TEMPLATES = {
  bicycle_rental: `["amenity"="bicycle_rental"]`,
  car_rental: `["amenity"="car_rental"]`,
  tourism_attraction: `["tourism"="attraction"]`,
  cave: `["natural"="cave_entrance"]`,
  beach: `["natural"="beach"]`,
  viewpoint: `["tourism"="viewpoint"]`,
  museum: `["tourism"="museum"]`,
  zoo: `["tourism"="zoo"]`,
  theme_park: `["tourism"="theme_park"]`,
  hiking: `["sport"="hiking"]`,
  waterfall: `["waterway"="waterfall"]`,
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

  const overpassQuery = `
    [out:json][timeout:30];
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
      const response = await fetch(OVERPASS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(overpassQuery)}`,
      });

      if (!response.ok) {
        throw new Error(
          `OSM Overpass error: ${response.status} ${response.statusText}`,
        );
      }

      return response.json() as Promise<OsmResponse>;
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
  const name = tags.name ?? tags["name:en"] ?? tags["name:pl"];

  if (!name) return null;

  const subcategories: string[] = [];
  if (tags.sport) subcategories.push(...tags.sport.split(";"));
  if (tags.tourism) subcategories.push(tags.tourism);
  if (tags.amenity) subcategories.push(tags.amenity);

  const addressParts = [
    tags["addr:street"],
    tags["addr:housenumber"],
    tags["addr:postcode"],
    tags["addr:city"],
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
): Promise<{ inserted: number; updated: number }> {
  const supabase = createAdminClient();

  if (places.length === 0) return { inserted: 0, updated: 0 };

  const rows = places.map((p) => ({
    external_id: p.external_id,
    source: "osm",
    destination_id: destinationId,
    name: p.name,
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

  const { error, count } = await supabase
    .from("attractions")
    .upsert(rows, {
      onConflict: "source,external_id",
      count: "exact",
    });

  if (error) throw new Error(`Failed to persist OSM places: ${error.message}`);

  return { inserted: count ?? 0, updated: 0 };
}

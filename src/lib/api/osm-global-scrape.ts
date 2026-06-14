import { createAdminClient } from "@/lib/supabase/admin";
import { fetchOsmPlaces, persistOsmPlaces } from "./osm";
import type { OsmCategory } from "./osm";
import type { BoundingBox } from "@/types/domain";

const STRATEGIC_BBOXES: { name: string; bbox: BoundingBox }[] = [
  {
    name: "Iberia + Madeira + Canary",
    bbox: { north: 44, south: 27, east: 4, west: -19 },
  },
  { name: "Italy + Malta", bbox: { north: 47, south: 35, east: 19, west: 6 } },
  { name: "Balkans", bbox: { north: 47, south: 35, east: 30, west: 13 } },
  { name: "Greece + Cyprus", bbox: { north: 42, south: 34, east: 35, west: 19 } },
  { name: "Turkey", bbox: { north: 42, south: 36, east: 45, west: 25 } },
  { name: "North Africa", bbox: { north: 37, south: 20, east: 36, west: -17 } },
  { name: "Middle East", bbox: { north: 38, south: 12, east: 60, west: 32 } },
  { name: "SE Asia", bbox: { north: 24, south: -11, east: 141, west: 92 } },
  {
    name: "Caribbean + Central America",
    bbox: { north: 25, south: 7, east: -60, west: -120 },
  },
  { name: "Poland + neighbors", bbox: { north: 56, south: 47, east: 25, west: 12 } },
];

const ALL_OSM_CATEGORIES: OsmCategory[] = [
  "tourism_attraction",
  "bicycle_rental",
  "car_rental",
  "cave",
  "beach",
  "viewpoint",
  "museum",
  "zoo",
  "theme_park",
  "hiking",
  "waterfall",
];

export async function performGlobalOsmScrape(options?: {
  bboxFilter?: string[];
  delayBetweenRequestsMs?: number;
}): Promise<{
  total_fetched: number;
  total_persisted: number;
  per_bbox: Array<{ bbox_name: string; categories: Record<string, number> }>;
  errors: Array<{ bbox: string; category: string; error: string }>;
}> {
  const delay = options?.delayBetweenRequestsMs ?? 1500;
  const bboxes = options?.bboxFilter
    ? STRATEGIC_BBOXES.filter((b) => options.bboxFilter!.includes(b.name))
    : STRATEGIC_BBOXES;

  const result = {
    total_fetched: 0,
    total_persisted: 0,
    per_bbox: [] as Array<{
      bbox_name: string;
      categories: Record<string, number>;
    }>,
    errors: [] as Array<{ bbox: string; category: string; error: string }>,
  };

  for (const { name, bbox } of bboxes) {
    const perBbox: { bbox_name: string; categories: Record<string, number> } =
      {
        bbox_name: name,
        categories: {},
      };

    for (const category of ALL_OSM_CATEGORIES) {
      try {
        const places = await fetchOsmPlaces({
          bbox,
          category,
          forceRefresh: true,
        });
        const { upserted } = await persistOsmPlaces(places, null);
        perBbox.categories[category] = places.length;
        result.total_fetched += places.length;
        result.total_persisted += upserted;
        await sleep(delay);
      } catch (error) {
        result.errors.push({
          bbox: name,
          category,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    result.per_bbox.push(perBbox);
  }

  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function tagAttractionsWithActivities(): Promise<{
  total_attractions: number;
  total_tags_created: number;
  attractions_with_tags: number;
  errors: string[];
}> {
  const supabase = createAdminClient();

  const { data: mappings, error: mappingsError } = await supabase
    .from("activity_osm_mappings")
    .select("*");

  if (mappingsError || !mappings) {
    throw new Error(
      mappingsError?.message ?? "Failed to load OSM mappings",
    );
  }

  let totalTags = 0;
  let totalAttractions = 0;
  let attractionsWithTags = 0;
  const errors: string[] = [];
  const pageSize = 1000;
  let offset = 0;
  const upsertBatchSize = 500;

  while (true) {
    const { data: attractions, error: fetchError } = await supabase
      .from("attractions")
      .select("id, category, subcategories, tags")
      .range(offset, offset + pageSize - 1);

    if (fetchError) {
      errors.push(`Fetch attractions offset ${offset}: ${fetchError.message}`);
      break;
    }
    if (!attractions || attractions.length === 0) break;

    const tagInserts: Array<{
      attraction_id: string;
      activity_slug: string;
      confidence: number;
    }> = [];

    for (const attraction of attractions) {
      totalAttractions++;
      const rawTags =
        attraction.tags && typeof attraction.tags === "object"
          ? (attraction.tags as Record<string, unknown>)
          : {};
      const tags = enrichTagsForMatching(
        attraction.category,
        attraction.subcategories,
        rawTags,
      );
      const matches = matchAttractionToActivities(
        {
          category: attraction.category,
          subcategories: attraction.subcategories ?? [],
          tags,
        },
        mappings,
      );

      if (matches.length > 0) attractionsWithTags++;

      for (const match of matches) {
        tagInserts.push({
          attraction_id: attraction.id,
          activity_slug: match.activitySlug,
          confidence: match.confidence,
        });
      }
    }

    for (let i = 0; i < tagInserts.length; i += upsertBatchSize) {
      const batch = tagInserts.slice(i, i + upsertBatchSize);
      const { error: upsertError } = await supabase
        .from("attraction_activity_tags")
        .upsert(batch, { onConflict: "attraction_id,activity_slug" });

      if (upsertError) {
        errors.push(
          `Upsert batch offset ${offset}+${i}: ${upsertError.message}`,
        );
      } else {
        totalTags += batch.length;
      }
    }

    if (attractions.length < pageSize) break;
    offset += pageSize;
  }

  return {
    total_attractions: totalAttractions,
    total_tags_created: totalTags,
    attractions_with_tags: attractionsWithTags,
    errors,
  };
}

/** Bezpośrednie mapowanie kategorii OSM (z Overpass) → slug aktywności */
const OSM_CATEGORY_TO_ACTIVITIES: Record<string, string[]> = {
  museum: ["museums"],
  zoo: ["zoo"],
  theme_park: ["theme_parks"],
  viewpoint: ["viewpoints"],
  cave: ["caves"],
  waterfall: ["waterfalls"],
  bicycle_rental: ["bike_rental"],
  hiking: ["hiking_trails"],
  car_rental: [],
  tourism_attraction: [],
  beach: [], // obsługiwane osobno wg surface
};

/** Wartości z subcategories (np. tourism=museum w scrape tourism_attraction) */
const SUBCATEGORY_TO_ACTIVITIES: Record<string, string[]> = {
  museum: ["museums"],
  zoo: ["zoo"],
  theme_park: ["theme_parks"],
  viewpoint: ["viewpoints"],
  aquarium: ["aquarium"],
  attraction: [],
};

const CATEGORY_TAG_HINTS: Record<string, Record<string, string>> = {
  museum: { tourism: "museum" },
  zoo: { tourism: "zoo" },
  theme_park: { tourism: "theme_park" },
  viewpoint: { tourism: "viewpoint" },
  cave: { natural: "cave_entrance" },
  beach: { natural: "beach" },
  waterfall: { waterway: "waterfall", natural: "waterfall" },
  bicycle_rental: { amenity: "bicycle_rental" },
  car_rental: { amenity: "car_rental" },
  hiking: { sport: "hiking" },
  tourism_attraction: { tourism: "attraction" },
};

function enrichTagsForMatching(
  category: string,
  subcategories: string[],
  tags: Record<string, unknown>,
): Record<string, unknown> {
  const enriched: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(tags)) {
    if (value != null && value !== "") enriched[key] = value;
  }

  const hints = CATEGORY_TAG_HINTS[category];
  if (hints) {
    for (const [key, value] of Object.entries(hints)) {
      enriched[key] = value;
    }
  }
  for (const sub of subcategories) {
    if (sub) enriched.sport = sub;
  }
  return enriched;
}

function beachActivitySlugs(tags: Record<string, unknown>): string[] {
  const surface = String(tags.surface ?? "").toLowerCase();
  if (surface.includes("sand")) return ["sandy_beaches"];
  if (/pebble|gravel|rock/.test(surface)) return ["rocky_beaches"];
  return ["sandy_beaches", "rocky_beaches"];
}

function matchAttractionToActivities(
  attraction: {
    category: string;
    subcategories: string[];
    tags: Record<string, unknown>;
  },
  mappings: Array<{ activity_slug: string; osm_query: string; priority: number }>,
): Array<{ activitySlug: string; confidence: number }> {
  const matches = new Map<string, number>();

  const add = (slug: string, confidence: number) => {
    const existing = matches.get(slug);
    if (!existing || confidence > existing) matches.set(slug, confidence);
  };

  if (attraction.category === "beach") {
    for (const slug of beachActivitySlugs(attraction.tags)) {
      add(slug, 1.0);
    }
  } else {
    for (const slug of OSM_CATEGORY_TO_ACTIVITIES[attraction.category] ?? []) {
      add(slug, 1.0);
    }
  }

  for (const sub of attraction.subcategories) {
    for (const slug of SUBCATEGORY_TO_ACTIVITIES[sub] ?? []) {
      add(slug, 0.95);
    }
  }

  for (const mapping of mappings) {
    if (queryMatchesAttraction(mapping.osm_query, attraction)) {
      const confidence = mapping.priority === 1 ? 1.0 : 1.0 / mapping.priority;
      add(mapping.activity_slug, confidence);
    }
  }

  return Array.from(matches.entries()).map(([activitySlug, confidence]) => ({
    activitySlug,
    confidence,
  }));
}

function queryMatchesAttraction(
  query: string,
  attraction: {
    category: string;
    subcategories: string[];
    tags: Record<string, unknown>;
  },
): boolean {
  const conditions = Array.from(
    query.matchAll(/\["([^"]+)"(?:([=~])"([^"]+)")?\]/g),
  );

  for (const condition of conditions) {
    const [, key, op, value] = condition;
    const tagValue = String(attraction.tags[key] ?? "");

    if (!op) {
      if (!tagValue) return false;
      continue;
    }

    if (op === "=") {
      if (tagValue !== value) return false;
    } else if (op === "~") {
      const regex = new RegExp(value, "i");
      if (!regex.test(tagValue)) return false;
    }
  }

  return conditions.length > 0;
}

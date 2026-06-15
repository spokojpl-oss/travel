import { apiEnv } from "@/config/api-env";
import {
  searchPlacesByText,
  type GooglePlace,
} from "@/lib/api/google-places";
import { createAdminClient } from "@/lib/supabase/admin";
import { pointInIslandBbox } from "@/lib/destinations/island-boundary";
import { distanceKm } from "@/lib/search/geo-clustering";
import type { BoundingBox, GeoPoint } from "@/types/domain";
import type { Json } from "@/types/database";

/** Zapytania Google Places Text Search — działają dla usług komercyjnych (OSM ich nie ma). */
const GOOGLE_QUERIES_BY_ACTIVITY: Record<string, string[]> = {
  zoo: ["zoo", "wildlife park"],
  aquarium: ["aquarium", "dolphinarium", "sea life"],
  theme_parks: ["theme park", "amusement park"],
  water_parks: ["water park", "aquapark"],
  museums: ["museum"],
  sandy_beaches: ["beach", "sandy beach"],
  rocky_beaches: ["beach", "rocky beach"],
  viewpoints: ["scenic viewpoint", "mirador"],
  caves: ["cave tour", "show cave"],
  waterfalls: ["waterfall"],
  quads: ["ATV quad tour", "quad rental"],
  buggies: ["buggy tour", "dune buggy"],
  kayaking: ["kayak rental", "kayak tour"],
  paddleboard: ["paddleboard rental SUP"],
  diving: ["diving center scuba"],
  snorkeling: ["snorkeling tour"],
  surfing: ["surf school"],
  bike_rental: ["bicycle rental", "bike rental"],
  ebike_rental: ["e-bike rental electric bicycle"],
  mountain_biking: ["mountain bike rental"],
  paragliding: ["paragliding tandem"],
  boat_tour: ["boat tour cruise"],
  jet_ski: ["jet ski rental"],
  car_rental: ["car rental"],
  hiking_trails: ["hiking trail"],
  climbing: ["climbing gym outdoor"],
  castles: ["castle"],
  old_towns: ["historic old town"],
  archaeology: ["archaeological site ruins"],
  national_parks: ["national park"],
  canyons: ["canyon gorge"],
};

function bboxFromCenter(
  lat: number,
  lon: number,
  radiusKm: number,
): BoundingBox {
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    north: lat + latDelta,
    south: lat - latDelta,
    east: lon + lonDelta,
    west: lon - lonDelta,
  };
}

async function persistGooglePlace(
  place: GooglePlace,
  activitySlug: string,
): Promise<string | null> {
  if (!place.location) return null;

  const supabase = createAdminClient();
  const externalId = `google:${place.place_id.replace(/^places\//, "")}`;

  const { data, error } = await supabase
    .from("attractions")
    .upsert(
      {
        external_id: externalId,
        source: "google",
        name: place.name,
        category: "google_places",
        subcategories: place.types,
        lat: place.location.lat,
        lon: place.location.lon,
        address: place.address,
        phone: place.phone,
        website: place.website,
        opening_hours: place.opening_hours.join("; ") || null,
        tags: {
          google_types: place.types,
          rating: place.rating,
          rating_count: place.rating_count,
        } as Json,
      },
      { onConflict: "source,external_id" },
    )
    .select("id")
    .single();

  if (error || !data) return null;

  await supabase.from("attraction_activity_tags").upsert(
    {
      attraction_id: data.id,
      activity_slug: activitySlug,
      confidence: 0.92,
    },
    { onConflict: "attraction_id,activity_slug" },
  );

  return data.id;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]!);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

function placeWithinArea(
  place: GooglePlace,
  center: GeoPoint,
  radiusKm: number,
  islandBbox?: BoundingBox,
): boolean {
  if (!place.location) return false;
  if (islandBbox && !pointInIslandBbox(place.location, islandBbox)) return false;
  return distanceKm(center, place.location) <= radiusKm;
}

export async function fillDestinationAttractionsFromGoogle({
  lat,
  lon,
  radiusKm,
  activitySlugs,
  destinationLabel,
  onlySlugs,
  searchBbox,
  islandBbox,
  maxConcurrent = 4,
}: {
  lat: number;
  lon: number;
  radiusKm: number;
  activitySlugs: string[];
  destinationLabel?: string;
  onlySlugs?: string[];
  searchBbox?: BoundingBox;
  islandBbox?: BoundingBox;
  maxConcurrent?: number;
}): Promise<{ persisted: number; tagged: number }> {
  if (!apiEnv.GOOGLE_PLACES_API_KEY) {
    return { persisted: 0, tagged: 0 };
  }

  const bbox = searchBbox ?? bboxFromCenter(lat, lon, radiusKm);
  const center = { lat, lon };
  const areaHint =
    destinationLabel?.split(",")[0]?.trim() ||
    destinationLabel?.trim() ||
    "";
  const slugs = onlySlugs?.length
    ? activitySlugs.filter((s) => onlySlugs.includes(s))
    : activitySlugs;

  const seen = new Set<string>();
  let persisted = 0;

  type QueryTask = { slug: string; textQuery: string };

  const tasks: QueryTask[] = [];
  for (const slug of slugs) {
    const queries = GOOGLE_QUERIES_BY_ACTIVITY[slug] ?? [
      slug.replace(/_/g, " "),
    ];
    for (const baseQuery of queries.slice(0, 2)) {
      const textQuery = areaHint ? `${baseQuery} ${areaHint}` : baseQuery;
      tasks.push({ slug, textQuery });
    }
  }

  await mapWithConcurrency(tasks, maxConcurrent, async (task) => {
    try {
      const places = await searchPlacesByText({
        textQuery: task.textQuery,
        bbox,
        forceRefresh: true,
      });

      for (const place of places) {
        if (!placeWithinArea(place, center, radiusKm, islandBbox)) continue;
        const key = place.place_id;
        if (seen.has(key)) continue;
        seen.add(key);

        const id = await persistGooglePlace(place, task.slug);
        if (id) persisted++;
      }
    } catch {
      /* skip failed query */
    }
  });

  return { persisted, tagged: persisted };
}

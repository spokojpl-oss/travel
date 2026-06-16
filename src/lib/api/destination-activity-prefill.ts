import { apiEnv } from "@/config/api-env";
import { fillDestinationAttractionsFromGoogle } from "@/lib/api/destination-google-fill";
import { fillDestinationAttractionsQuick } from "@/lib/api/destination-osm-fill";
import { resolveIslandBoundaryForSearch } from "@/lib/destinations/island-boundary";

/** Promień uzupełniania OSM/Google — mniejszy niż zasięg liczenia (Overpass timeout). */
export function fillRadiusKm(searchRadiusKm: number): number {
  return Math.min(searchRadiusKm, 70);
}

/** Aktywności komercyjne / słabo w OSM — uzupełniane z Google Places. */
export const GOOGLE_PREFILL_SLUGS = [
  "zoo",
  "aquarium",
  "theme_parks",
  "water_parks",
  "museums",
  "quads",
  "buggies",
  "diving",
  "snorkeling",
  "kayaking",
  "paddleboard",
  "boat_tour",
  "jet_ski",
  "surfing",
  "paragliding",
  "bike_rental",
  "ebike_rental",
  "mountain_biking",
  "viewpoints",
  "castles",
  "waterfalls",
  "caves",
  "national_parks",
  "old_towns",
  "archaeology",
  "climbing",
] as const;

const GOOGLE_PREFILL_SET = new Set<string>(GOOGLE_PREFILL_SLUGS);

/** Wypożyczalnie, wycieczki, sporty wodne — OSM ich prawie nie ma. */
export function isCommercialActivity(slug: string): boolean {
  return GOOGLE_PREFILL_SET.has(slug);
}

export function commercialActivitySlugs(slugs: string[]): string[] {
  return slugs.filter(isCommercialActivity);
}

export async function ensureDestinationActivities({
  lat,
  lon,
  radiusKm,
  destinationLabel,
  activitySlugs = [],
}: {
  lat: number;
  lon: number;
  radiusKm: number;
  destinationLabel?: string;
  activitySlugs?: string[];
}): Promise<{ osmPersisted: number; googlePersisted: number }> {
  const island = resolveIslandBoundaryForSearch(destinationLabel, { lat, lon });
  const fillRadius = island
    ? Math.min(radiusKm, island.maxRadiusKm)
    : fillRadiusKm(radiusKm);
  const searchBbox = island?.bbox;
  const slugs =
    activitySlugs.length > 0 ? activitySlugs : [...GOOGLE_PREFILL_SLUGS];

  const osmPromise = fillDestinationAttractionsQuick({
    lat,
    lon,
    radiusKm: fillRadius,
    activitySlugs: slugs,
    searchBbox,
  }).catch(() => ({ persisted: 0, tagged: 0 }));

  let googlePromise: Promise<{ persisted: number; tagged: number }> =
    Promise.resolve({ persisted: 0, tagged: 0 });

  if (apiEnv.GOOGLE_PLACES_API_KEY) {
    googlePromise = fillDestinationAttractionsFromGoogle({
      lat,
      lon,
      radiusKm: fillRadius,
      activitySlugs: slugs,
      destinationLabel,
      searchBbox,
      islandBbox: island?.bbox,
      onlySlugs:
        activitySlugs.length > 0
          ? activitySlugs
          : slugs.slice(0, 6),
      maxConcurrent: 4,
    }).catch(() => ({ persisted: 0, tagged: 0 }));
  }

  const [osm, google] = await Promise.all([osmPromise, googlePromise]);

  return {
    osmPersisted: osm.persisted,
    googlePersisted: google.persisted,
  };
}

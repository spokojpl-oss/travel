import { fillDestinationAttractionsFromGoogle } from "@/lib/api/destination-google-fill";
import { fillDestinationAttractionsFromOsm } from "@/lib/api/destination-osm-fill";

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

export async function ensureDestinationActivities({
  lat,
  lon,
  radiusKm,
  destinationLabel,
}: {
  lat: number;
  lon: number;
  radiusKm: number;
  destinationLabel?: string;
}): Promise<{ osmPersisted: number; googlePersisted: number }> {
  const fillRadius = fillRadiusKm(radiusKm);

  const [osm, google] = await Promise.all([
    fillDestinationAttractionsFromOsm({
      lat,
      lon,
      radiusKm: fillRadius,
      activitySlugs: [...GOOGLE_PREFILL_SLUGS],
    }).catch(() => ({ persisted: 0, tagged: 0 })),
    fillDestinationAttractionsFromGoogle({
      lat,
      lon,
      radiusKm: fillRadius,
      activitySlugs: [...GOOGLE_PREFILL_SLUGS],
      destinationLabel,
    }).catch(() => ({ persisted: 0, tagged: 0 })),
  ]);

  return {
    osmPersisted: osm.persisted,
    googlePersisted: google.persisted,
  };
}

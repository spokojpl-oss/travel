import type { ActivityType } from "@/types/activities";
import type { ElevationPoint } from "@/types/activities";
import type { GeoJsonLineString } from "@/lib/activities/cycling/geometry";
import { isPlausibleCyclingRoute } from "@/lib/activities/cycling/route-validation";

const ORS_PROFILES: Partial<Record<ActivityType, string>> = {
  cycling_road: "cycling-road",
  cycling_gravel: "cycling-regular",
  cycling_mtb: "cycling-mountain",
  cycling_ebike: "cycling-electric",
  cycling_touring: "cycling-regular",
};

/** Profile fallback when strict road network has no snap near centroid. */
const PROFILE_FALLBACKS: Record<string, string[]> = {
  "cycling-road": ["cycling-road", "cycling-regular", "cycling-mountain"],
  "cycling-regular": ["cycling-regular", "cycling-mountain"],
  "cycling-mountain": ["cycling-mountain", "cycling-regular"],
  "cycling-electric": ["cycling-electric", "cycling-regular", "cycling-road"],
};

const SNAP_RADII_M = [3500, 8000, 15000];

interface GenerateInput {
  startLat: number;
  startLng: number;
  targetDistanceKm: number;
  activityType: ActivityType;
  loop: boolean;
  /** Maks. odległość punktów trasy od startu (km) — domyślnie ~35 km. */
  maxRadiusKm?: number;
  /** Stały seed ORS round_trip — różne trasy przy kolejnych generacjach. */
  seed?: number;
}

type OrsErrorBody = {
  error?: { code?: number; message?: string };
};

function parseOrsError(status: number, text: string): string {
  try {
    const body = JSON.parse(text) as OrsErrorBody;
    const msg = body.error?.message ?? text;
    if (msg.includes("Could not find a valid point") || msg.includes("Could not find point")) {
      return (
        "Nie udało się znaleźć drogi rowerowej w pobliżu środka destynacji. " +
        "Spróbuj OSM scraper (prawdziwe szlaki) albo wybierz region bliżej miasta."
      );
    }
    return `ORS error: ${status} ${msg}`;
  } catch {
    return `ORS error: ${status} ${text}`;
  }
}

async function snapToNetwork(
  profile: string,
  lng: number,
  lat: number,
  apiKey: string,
): Promise<{ lng: number; lat: number } | null> {
  for (const radius of SNAP_RADII_M) {
    const res = await fetch(
      `https://api.openrouteservice.org/v2/snap/${profile}/geojson`,
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locations: [[lng, lat]],
          radius,
        }),
      },
    );

    if (!res.ok) continue;

    const data = (await res.json()) as {
      features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
    };
    const coords = data.features?.[0]?.geometry?.coordinates;
    if (coords && Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
      return { lng: coords[0], lat: coords[1] };
    }
  }

  return null;
}

async function requestRoute(
  profile: string,
  lng: number,
  lat: number,
  input: GenerateInput,
  apiKey: string,
): Promise<{
  feature: {
    geometry: { coordinates: number[][] };
    properties: {
      summary: { distance: number };
      ascent?: number;
      descent?: number;
    };
  };
  snappedLng: number;
  snappedLat: number;
}> {
  const snapped = await snapToNetwork(profile, lng, lat, apiKey);
  const startLng = snapped?.lng ?? lng;
  const startLat = snapped?.lat ?? lat;

  const endpoint = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;

  const body = input.loop
    ? {
        coordinates: [[startLng, startLat]],
        radiuses: [SNAP_RADII_M[SNAP_RADII_M.length - 1]!],
        options: {
          round_trip: {
            length: input.targetDistanceKm * 1000,
            points: 5,
            seed: input.seed ?? Math.floor(Math.random() * 100),
          },
        },
        elevation: true,
      }
    : {
        coordinates: [[startLng, startLat]],
        radiuses: [SNAP_RADII_M[SNAP_RADII_M.length - 1]!],
        elevation: true,
      };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(parseOrsError(res.status, await res.text()));
  }

  const data = (await res.json()) as {
    features: Array<{
      geometry: { coordinates: number[][] };
      properties: {
        summary: { distance: number };
        ascent?: number;
        descent?: number;
      };
    }>;
  };

  const feature = data.features[0];
  if (!feature) throw new Error("ORS returned no route");

  const summary = feature.properties.summary;
  if (
    !isPlausibleCyclingRoute({
      distanceM: summary.distance,
      targetDistanceKm: input.targetDistanceKm,
      coordinates: feature.geometry.coordinates,
      startLat: input.startLat,
      startLng: input.startLng,
      maxRadiusKm: input.maxRadiusKm,
    })
  ) {
    throw new Error(
      "Wygenerowana trasa jest nierealistyczna (zbyt długa lub poza regionem).",
    );
  }

  return {
    feature,
    snappedLng: startLng,
    snappedLat: startLat,
  };
}

export async function generateCyclingRoute(input: GenerateInput) {
  const primaryProfile = ORS_PROFILES[input.activityType];
  if (!primaryProfile) {
    throw new Error(`Unsupported activity type for ORS: ${input.activityType}`);
  }

  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) throw new Error("ORS_API_KEY is not set");

  const profiles = PROFILE_FALLBACKS[primaryProfile] ?? [primaryProfile];
  let lastError: Error | null = null;

  for (const profile of profiles) {
    try {
      const { feature, snappedLng, snappedLat } = await requestRoute(
        profile,
        input.startLng,
        input.startLat,
        input,
        apiKey,
      );

      const summary = feature.properties.summary;
      const coords = feature.geometry.coordinates;

      const geometryWkt = `LINESTRING(${coords.map((c) => `${c[0]} ${c[1]}`).join(", ")})`;
      const geometryGeoJson: GeoJsonLineString = {
        type: "LineString",
        coordinates: coords.map(([lng, lat]) => [lng, lat]),
      };

      const elevation_profile: ElevationPoint[] = coords.map((c, i) => ({
        km: (i * (summary.distance / coords.length)) / 1000,
        elev_m: Math.round(c[2] ?? 0),
      }));

      return {
        distance_m: Math.round(summary.distance),
        elevation_gain_m: Math.round(feature.properties.ascent ?? 0),
        elevation_loss_m: Math.round(feature.properties.descent ?? 0),
        surface_mix: null,
        geometryWkt,
        geometryGeoJson,
        elevation_profile,
        snappedLng,
        snappedLat,
        orsProfile: profile,
      };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError ?? new Error("ORS route generation failed");
}

import type { ActivityType } from "@/types/activities";
import type { ElevationPoint } from "@/types/activities";
import {
  lineStringGeoJson,
  pointGeoJson,
  type GeoJsonLineString,
} from "@/lib/activities/cycling/geometry";

const ORS_PROFILES: Partial<Record<ActivityType, string>> = {
  cycling_road: "cycling-road",
  cycling_gravel: "cycling-regular",
  cycling_mtb: "cycling-mountain",
  cycling_ebike: "cycling-electric",
  cycling_touring: "cycling-regular",
};

interface GenerateInput {
  startLat: number;
  startLng: number;
  targetDistanceKm: number;
  activityType: ActivityType;
  loop: boolean;
}

export async function generateCyclingRoute(input: GenerateInput) {
  const profile = ORS_PROFILES[input.activityType];
  if (!profile) {
    throw new Error(`Unsupported activity type for ORS: ${input.activityType}`);
  }

  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) throw new Error("ORS_API_KEY is not set");

  const endpoint = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;

  const body = input.loop
    ? {
        coordinates: [[input.startLng, input.startLat]],
        options: {
          round_trip: {
            length: input.targetDistanceKm * 1000,
            points: 5,
            seed: Math.floor(Math.random() * 100),
          },
        },
        elevation: true,
      }
    : {
        coordinates: [[input.startLng, input.startLat]],
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
  if (!res.ok) throw new Error(`ORS error: ${res.status} ${await res.text()}`);

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
  };
}

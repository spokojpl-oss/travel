import { createAdminClient } from "@/lib/supabase/admin";
import type { BoundingBox } from "@/types/domain";
import {
  lineStringWkt,
  pointWkt,
  wktLineStringToGeoJson,
} from "@/lib/activities/cycling/geometry";
import {
  buildRelationLineString,
  fetchCyclingNetwork,
  indexOverpassElements,
  mapNetworkToActivityType,
} from "@/lib/activities/cycling/osm-overpass";

function parseBbox(raw: unknown): BoundingBox | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, number>;
  if (
    typeof b.north !== "number" ||
    typeof b.south !== "number" ||
    typeof b.east !== "number" ||
    typeof b.west !== "number"
  ) {
    return null;
  }
  return b as BoundingBox;
}

function haversineM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateLineDistanceM(geometryWkt: string): number {
  const match = geometryWkt.match(/LINESTRING\s*\(([^)]+)\)/i);
  if (!match) return 1000;

  const points = match[1]!
    .split(",")
    .map((pair) => {
      const [lng, lat] = pair.trim().split(/\s+/).map(Number);
      return { lat, lng };
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineM(
      points[i - 1]!.lat,
      points[i - 1]!.lng,
      points[i]!.lat,
      points[i]!.lng,
    );
  }
  return Math.max(Math.round(total), 100);
}

export async function scrapeOsmCyclingRoutesForDestination(
  destinationId: string,
): Promise<{ persisted: number; skipped: number }> {
  const supabase = createAdminClient();
  const { data: destination, error } = await supabase
    .from("destinations")
    .select("id, name, bounding_box")
    .eq("id", destinationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!destination) throw new Error("Destination not found");

  const bbox = parseBbox(destination.bounding_box);
  if (!bbox) {
    return { persisted: 0, skipped: 0 };
  }

  const response = await fetchCyclingNetwork(bbox);
  const index = indexOverpassElements(response.elements);
  const relations = response.elements.filter((el) => el.type === "relation");

  let persisted = 0;
  let skipped = 0;

  for (const relation of relations) {
    const tags = relation.tags ?? {};
    const name = tags.name ?? tags["name:en"] ?? tags["name:pl"];
    if (!name) {
      skipped++;
      continue;
    }

    const geometryWkt = buildRelationLineString(relation, index);
    if (!geometryWkt) {
      skipped++;
      continue;
    }

    const startMatch = geometryWkt.match(/LINESTRING\s*\(([^,]+)/i);
    const startCoords = startMatch?.[1]?.trim().split(/\s+/).map(Number);
    if (!startCoords || startCoords.length < 2) {
      skipped++;
      continue;
    }

    const geometryGeoJson = wktLineStringToGeoJson(geometryWkt);
    if (!geometryGeoJson) {
      skipped++;
      continue;
    }

    const geometryInsert = lineStringWkt(geometryGeoJson.coordinates);
    if (!geometryInsert) {
      skipped++;
      continue;
    }

    const [startLng, startLat] = startCoords;
    const activityType = mapNetworkToActivityType(tags);
    const sourceExternalId = `osm:relation/${relation.id}`;
    const distanceM = estimateLineDistanceM(geometryWkt);

    const row = {
      destination_id: destination.id,
      category: "cycling" as const,
      activity_type: activityType,
      source: "osm" as const,
      source_external_id: sourceExternalId,
      name,
      description: tags.description ?? tags.note ?? null,
      distance_m: distanceM,
      is_loop: false,
      start_point: pointWkt(startLng, startLat),
      geometry: geometryInsert,
      popularity_score:
        tags.network === "icn" || tags.network === "ncn"
          ? 80
          : tags.network === "rcn"
            ? 50
            : 20,
    };

    const { error: upsertError } = await supabase.from("activity_routes").upsert(row, {
      onConflict: "destination_id,source_external_id",
    });

    if (upsertError) {
      skipped++;
      continue;
    }

    persisted++;
  }

  return { persisted, skipped };
}

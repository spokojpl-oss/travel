/**
 * Scrape OSM cycling route networks into activity_routes.
 *
 * pnpm scrape:cycling-osm -- --destination-id <uuid>
 * pnpm scrape:cycling-osm -- --all-european
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";
import type { BoundingBox } from "../src/types/domain";
import {
  lineStringWkt,
  pointWkt,
  wktLineStringToGeoJson,
} from "../src/lib/activities/cycling/geometry";
import {
  buildRelationLineString,
  fetchCyclingNetwork,
  indexOverpassElements,
  mapNetworkToActivityType,
} from "../src/lib/activities/cycling/osm-overpass";

const EUROPEAN_COUNTRY_CODES = new Set([
  "AD", "AL", "AT", "BA", "BE", "BG", "BY", "CH", "CY", "CZ", "DE", "DK", "EE",
  "ES", "FI", "FR", "GB", "GR", "HR", "HU", "IE", "IS", "IT", "LI", "LT", "LU",
  "LV", "MC", "MD", "ME", "MK", "MT", "NL", "NO", "PL", "PT", "RO", "RS", "SE",
  "SI", "SK", "SM", "UA", "VA", "XK",
]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function parseArgs() {
  const destinationIdArg = process.argv.find((a) =>
    a.startsWith("--destination-id="),
  );
  const allEuropean = process.argv.includes("--all-european");

  return {
    destinationId: destinationIdArg?.replace("--destination-id=", "").trim(),
    allEuropean,
  };
}

async function scrapeDestination(
  supabase: ReturnType<typeof createClient<Database>>,
  destination: {
    id: string;
    name: string;
    bounding_box: unknown;
  },
): Promise<{ persisted: number; skipped: number }> {
  const bbox = parseBbox(destination.bounding_box);
  if (!bbox) {
    console.log(`  ⊘ ${destination.name}: brak bounding_box`);
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

    const { error } = await supabase.from("activity_routes").upsert(row, {
      onConflict: "destination_id,source_external_id",
    });

    if (error) {
      console.log(`  ✗ ${name}: ${error.message}`);
      skipped++;
      continue;
    }

    persisted++;
  }

  return { persisted, skipped };
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Ustaw NEXT_PUBLIC_SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY w .env.local",
    );
  }

  const { destinationId, allEuropean } = parseArgs();
  if (!destinationId && !allEuropean) {
    throw new Error(
      "Podaj --destination-id=<uuid> lub --all-european",
    );
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let query = supabase
    .from("destinations")
    .select("id, name, bounding_box, country_code");

  if (destinationId) {
    query = query.eq("id", destinationId);
  } else {
    query = query.in("country_code", [...EUROPEAN_COUNTRY_CODES]);
  }

  const { data: destinations, error } = await query;
  if (error) throw error;
  if (!destinations?.length) {
    console.log("Brak destynacji do scrapowania.");
    return;
  }

  console.log(`Cycling OSM scrape: ${destinations.length} destynacji`);

  let totalPersisted = 0;
  let totalSkipped = 0;

  for (const destination of destinations) {
    console.log(`→ ${destination.name}`);
    try {
      const result = await scrapeDestination(supabase, destination);
      totalPersisted += result.persisted;
      totalSkipped += result.skipped;
      console.log(
        `  ✓ zapisano ${result.persisted}, pominięto ${result.skipped}`,
      );
    } catch (e) {
      console.log(
        `  ✗ błąd: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    await sleep(1500);
  }

  console.log("\nPodsumowanie:", {
    destinations: destinations.length,
    persisted: totalPersisted,
    skipped: totalSkipped,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

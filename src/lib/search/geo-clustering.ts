import crypto from "node:crypto";
import type {
  AttractionWithActivities,
  BoundingBox,
  GeoCluster,
  GeoPoint,
} from "@/types/domain";

export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function toGeoPoint(attraction: AttractionWithActivities): GeoPoint {
  return {
    lat: Number(attraction.lat),
    lon: Number(attraction.lon),
  };
}

export function clusterAttractions({
  attractions,
  selectedActivities,
  matchMode,
  maxRadiusKm,
  minPerActivity,
}: {
  attractions: AttractionWithActivities[];
  selectedActivities: string[];
  matchMode: "all" | "any";
  maxRadiusKm: number;
  minPerActivity: number;
}): GeoCluster[] {
  if (attractions.length === 0) return [];

  const seeds = pickGridSeeds(attractions, maxRadiusKm, 180);
  const candidateClusters: GeoCluster[] = [];

  for (const seed of seeds) {
    const seedCenter = toGeoPoint(seed);

    const inRange = attractions.filter(
      (a) => distanceKm(seedCenter, toGeoPoint(a)) <= maxRadiusKm,
    );

    if (inRange.length < 2) continue;

    const activityCounts: Record<string, number> = {};
    for (const slug of selectedActivities) activityCounts[slug] = 0;

    for (const attr of inRange) {
      for (const tag of attr.activity_tags) {
        if (selectedActivities.includes(tag.activity_slug)) {
          activityCounts[tag.activity_slug]++;
        }
      }
    }

    const coveredActivities = selectedActivities.filter(
      (slug) => activityCounts[slug] >= minPerActivity,
    );

    if (
      matchMode === "all" &&
      coveredActivities.length !== selectedActivities.length
    ) {
      continue;
    }
    if (matchMode === "any" && coveredActivities.length === 0) {
      continue;
    }

    const centroid = computeCentroid(inRange);
    const bbox = computeBoundingBox(inRange);
    const radius = Math.max(
      ...inRange.map((a) => distanceKm(centroid, toGeoPoint(a))),
    );

    const score = computeClusterScore({
      coveredActivities,
      totalRequested: selectedActivities.length,
      radiusKm: radius,
      maxRadiusKm,
      activityCounts,
    });

    candidateClusters.push({
      id: deterministicId(centroid),
      center: centroid,
      bbox,
      radius_km: round(radius, 1),
      attractions: inRange,
      covered_activities: coveredActivities,
      score,
      activity_counts: activityCounts,
    });
  }

  const deduped = dedupClusters(candidateClusters, 30);
  return deduped.sort((a, b) => b.score - a.score);
}

/** Ogranicza liczbę seedów — pełna pętla po wszystkich atrakcjach to O(n²) i timeout na Vercel */
function pickGridSeeds(
  attractions: AttractionWithActivities[],
  maxRadiusKm: number,
  maxSeeds: number,
): AttractionWithActivities[] {
  if (attractions.length <= maxSeeds) return attractions;

  const cellKm = Math.max(maxRadiusKm / 2, 8);
  const cells = new Map<string, AttractionWithActivities>();

  for (const a of attractions) {
    const lat = Number(a.lat);
    const lon = Number(a.lon);
    const latCell = Math.floor(lat / (cellKm / 111));
    const lonCell = Math.floor(
      lon / (cellKm / (111 * Math.cos((lat * Math.PI) / 180))),
    );
    const key = `${latCell}:${lonCell}`;
    if (!cells.has(key)) cells.set(key, a);
  }

  return Array.from(cells.values()).slice(0, maxSeeds);
}

function computeCentroid(attractions: AttractionWithActivities[]): GeoPoint {
  const sumLat = attractions.reduce((s, a) => s + Number(a.lat), 0);
  const sumLon = attractions.reduce((s, a) => s + Number(a.lon), 0);
  return {
    lat: sumLat / attractions.length,
    lon: sumLon / attractions.length,
  };
}

function computeBoundingBox(
  attractions: AttractionWithActivities[],
): BoundingBox {
  return {
    north: Math.max(...attractions.map((a) => Number(a.lat))),
    south: Math.min(...attractions.map((a) => Number(a.lat))),
    east: Math.max(...attractions.map((a) => Number(a.lon))),
    west: Math.min(...attractions.map((a) => Number(a.lon))),
  };
}

function computeClusterScore({
  coveredActivities,
  totalRequested,
  radiusKm,
  maxRadiusKm,
  activityCounts,
}: {
  coveredActivities: string[];
  totalRequested: number;
  attractionCount?: number;
  radiusKm: number;
  maxRadiusKm: number;
  activityCounts: Record<string, number>;
}): number {
  const coverage = coveredActivities.length / totalRequested;
  const density = 1 - radiusKm / maxRadiusKm;
  const variety =
    Object.values(activityCounts).reduce((s, c) => s + Math.log(c + 1), 0) /
    (totalRequested * Math.log(10));

  return round(coverage * 0.5 + density * 0.3 + Math.min(variety, 1) * 0.2, 3);
}

function dedupClusters(
  clusters: GeoCluster[],
  thresholdKm: number,
): GeoCluster[] {
  const sorted = [...clusters].sort((a, b) => b.score - a.score);
  const kept: GeoCluster[] = [];

  for (const cluster of sorted) {
    const isDuplicate = kept.some(
      (k) => distanceKm(k.center, cluster.center) < thresholdKm,
    );
    if (!isDuplicate) kept.push(cluster);
  }

  return kept;
}

function deterministicId(point: GeoPoint): string {
  return crypto
    .createHash("md5")
    .update(`${point.lat.toFixed(3)}:${point.lon.toFixed(3)}`)
    .digest("hex")
    .substring(0, 12);
}

function round(n: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

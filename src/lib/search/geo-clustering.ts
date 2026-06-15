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
    const cluster = buildTightCluster({
      seed,
      attractions,
      selectedActivities,
      matchMode,
      maxRadiusKm,
      minPerActivity,
    });
    if (cluster) candidateClusters.push(cluster);
  }

  const deduped = dedupClusters(candidateClusters, Math.max(maxRadiusKm, 12));
  return deduped.sort((a, b) => b.score - a.score);
}

/**
 * Klastr „na jeden dzień” — tylko atrakcje w promieniu maxRadiusKm od centrum,
 * z iteracyjnym zacieśnianiem (bez rozciągania po całej wyspie).
 */
function buildTightCluster({
  seed,
  attractions,
  selectedActivities,
  matchMode,
  maxRadiusKm,
  minPerActivity,
}: {
  seed: AttractionWithActivities;
  attractions: AttractionWithActivities[];
  selectedActivities: string[];
  matchMode: "all" | "any";
  maxRadiusKm: number;
  minPerActivity: number;
}): GeoCluster | null {
  const seedCenter = toGeoPoint(seed);
  let members = attractions.filter(
    (a) => distanceKm(seedCenter, toGeoPoint(a)) <= maxRadiusKm,
  );

  if (members.length === 0) return null;

  if (members.length === 1) {
    return finalizeCluster({
      members,
      selectedActivities,
      matchMode,
      minPerActivity,
      maxRadiusKm,
    });
  }

  for (let i = 0; i < 5; i++) {
    const centroid = computeCentroid(members);
    const tightened = members.filter(
      (a) => distanceKm(centroid, toGeoPoint(a)) <= maxRadiusKm,
    );
    if (tightened.length < 1) return null;
    if (tightened.length === 1) {
      members = tightened;
      break;
    }
    if (tightened.length < 2) return null;
    if (tightened.length === members.length) break;
    members = tightened;
  }

  const centroid = computeCentroid(members);
  const radius = Math.max(
    ...members.map((a) => distanceKm(centroid, toGeoPoint(a))),
    0,
  );

  if (radius > maxRadiusKm) return null;

  return finalizeCluster({
    members,
    selectedActivities,
    matchMode,
    minPerActivity,
    maxRadiusKm,
    centroid,
    radius,
  });
}

function finalizeCluster({
  members,
  selectedActivities,
  matchMode,
  minPerActivity,
  maxRadiusKm,
  centroid: centroidInput,
  radius: radiusInput,
}: {
  members: AttractionWithActivities[];
  selectedActivities: string[];
  matchMode: "all" | "any";
  minPerActivity: number;
  maxRadiusKm: number;
  centroid?: GeoPoint;
  radius?: number;
}): GeoCluster | null {
  const centroid = centroidInput ?? computeCentroid(members);
  const radius =
    radiusInput ??
    Math.max(...members.map((a) => distanceKm(centroid, toGeoPoint(a))), 0);

  const activityCounts: Record<string, number> = {};
  for (const slug of selectedActivities) activityCounts[slug] = 0;

  for (const attr of members) {
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
    return null;
  }
  if (matchMode === "any" && coveredActivities.length === 0) {
    return null;
  }

  const score = computeClusterScore({
    coveredActivities,
    totalRequested: selectedActivities.length,
    radiusKm: radius,
    maxRadiusKm,
    activityCounts,
  });

  return {
    id: deterministicId(centroid),
    center: centroid,
    bbox: computeBoundingBox(members),
    radius_km: round(Math.max(radius, 0.1), 1),
    attractions: members.sort(
      (a, b) =>
        distanceKm(centroid, toGeoPoint(a)) -
        distanceKm(centroid, toGeoPoint(b)),
    ),
    covered_activities: coveredActivities,
    score,
    activity_counts: activityCounts,
  };
}

/** Ogranicza liczbę seedów — pełna pętla po wszystkich atrakcjach to O(n²) i timeout na Vercel */
function pickGridSeeds(
  attractions: AttractionWithActivities[],
  maxRadiusKm: number,
  maxSeeds: number,
): AttractionWithActivities[] {
  if (attractions.length <= maxSeeds) return attractions;

  const cellKm = Math.max(maxRadiusKm / 2, 4);
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

  return round(coverage * 0.35 + density * 0.45 + Math.min(variety, 1) * 0.2, 3);
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

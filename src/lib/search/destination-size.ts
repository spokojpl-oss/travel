import type { BoundingBox } from "@/types/domain";
import {
  DESTINATION_CATALOG,
  type DestinationSuggestion,
} from "@/lib/destinations/catalog";
import { resolveIslandBoundary } from "@/lib/destinations/island-boundary";

export type DestinationKind = "island" | "city" | "region" | "country";

export type DestinationSizeProfile = {
  kind: DestinationKind;
  name: string;
  /** Approximate area in km² (islands from bbox, cities estimated). */
  areaKm2: number;
  /** Max drive km across destination (island diameter estimate). */
  maxDriveKm: number;
  /** Min days to cover whole place with beach + sightseeing mix. */
  wholeWithBeachDays: number;
  /** Min days to cover whole place sightseeing-only (fast pace). */
  wholeSightseeingDays: number;
  /** Extra days needed when traveling with kids. */
  kidsExtraDays: number;
};

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function bboxAreaKm2(bbox: BoundingBox): number {
  const midLat = (bbox.north + bbox.south) / 2;
  const latKm = (bbox.north - bbox.south) * 111;
  const lonKm =
    (bbox.east - bbox.west) *
    111 *
    Math.cos((midLat * Math.PI) / 180);
  return Math.round(latKm * lonKm);
}

function bboxMaxDriveKm(bbox: BoundingBox): number {
  const midLat = (bbox.north + bbox.south) / 2;
  const latKm = (bbox.north - bbox.south) * 111;
  const lonKm =
    (bbox.east - bbox.west) *
    111 *
    Math.cos((midLat * Math.PI) / 180);
  return Math.round(Math.sqrt(latKm ** 2 + lonKm ** 2));
}

function islandSizeTier(areaKm2: number): {
  wholeWithBeachDays: number;
  wholeSightseeingDays: number;
  kidsExtraDays: number;
} {
  if (areaKm2 <= 800) {
    return { wholeWithBeachDays: 5, wholeSightseeingDays: 3, kidsExtraDays: 1 };
  }
  if (areaKm2 <= 3000) {
    return { wholeWithBeachDays: 10, wholeSightseeingDays: 6, kidsExtraDays: 2 };
  }
  if (areaKm2 <= 12000) {
    return { wholeWithBeachDays: 14, wholeSightseeingDays: 9, kidsExtraDays: 3 };
  }
  return { wholeWithBeachDays: 21, wholeSightseeingDays: 14, kidsExtraDays: 4 };
}

const LARGE_REGION_NAMES = new Set([
  "sycylia",
  "sicily",
  "sardynia",
  "sardinia",
  "kreta",
  "crete",
  "cypr",
  "cyprus",
  "islandia",
  "iceland",
]);

const CITY_DRIVE_KM: Record<string, number> = {
  barcelona: 25,
  paryż: 20,
  paris: 20,
  rzym: 25,
  rome: 25,
  lizbona: 20,
  lisbon: 20,
  praga: 18,
  prague: 18,
  budapeszt: 18,
  budapest: 18,
  wiedeń: 18,
  vienna: 18,
  wenecja: 12,
  venice: 12,
  kraków: 15,
  krakow: 15,
  gdańsk: 12,
  gdansk: 12,
};

export function findCatalogDestination(
  destinationLabel: string | null | undefined,
): DestinationSuggestion | null {
  if (!destinationLabel?.trim()) return null;
  for (const entry of DESTINATION_CATALOG) {
    const n = normalizeSearchText(destinationLabel);
    const name = normalizeSearchText(entry.name);
    if (n.startsWith(name) || n.includes(name)) return entry;
    for (const alias of entry.aliases ?? []) {
      const a = normalizeSearchText(alias);
      if (n.includes(a) || a.includes(n.split(",")[0]?.trim() ?? "")) {
        return entry;
      }
    }
  }
  return null;
}

export function resolveDestinationSizeProfile(
  destinationLabel: string | null | undefined,
): DestinationSizeProfile | null {
  const entry = findCatalogDestination(destinationLabel);
  const island = resolveIslandBoundary(destinationLabel);

  if (island) {
    const areaKm2 = bboxAreaKm2(island.bbox);
    const maxDriveKm = island.maxRadiusKm * 2;
    const tier = islandSizeTier(areaKm2);
    return {
      kind: "island",
      name: island.name,
      areaKm2,
      maxDriveKm,
      ...tier,
    };
  }

  if (!entry) return null;

  const key = normalizeSearchText(entry.name);
  const isLargeRegion = LARGE_REGION_NAMES.has(key);

  if (isLargeRegion) {
    const bbox = entry.islandBbox;
    const areaKm2 = bbox ? bboxAreaKm2(bbox) : 15000;
    const tier = islandSizeTier(areaKm2);
    return {
      kind: "region",
      name: entry.name,
      areaKm2,
      maxDriveKm: bbox ? bboxMaxDriveKm(bbox) : 200,
      ...tier,
    };
  }

  const driveKm = CITY_DRIVE_KM[key] ?? 20;
  return {
    kind: "city",
    name: entry.name,
    areaKm2: Math.round(driveKm ** 2 * 0.6),
    maxDriveKm: driveKm,
    wholeWithBeachDays: 4,
    wholeSightseeingDays: 2,
    kidsExtraDays: 1,
  };
}

import {
  DESTINATION_CATALOG,
  type DestinationSuggestion,
} from "@/lib/destinations/catalog";
import { distanceKm } from "@/lib/search/geo-clustering";
import type { BoundingBox, GeoPoint } from "@/types/domain";

export type IslandBoundary = {
  name: string;
  bbox: BoundingBox;
  center: GeoPoint;
  primaryAirports: string[];
  /** Max distance from island center to any point on the island (km). */
  maxRadiusKm: number;
};

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function bboxCenter(bbox: BoundingBox): GeoPoint {
  return {
    lat: (bbox.north + bbox.south) / 2,
    lon: (bbox.east + bbox.west) / 2,
  };
}

function bboxMaxRadiusKm(bbox: BoundingBox, center: GeoPoint): number {
  const corners: GeoPoint[] = [
    { lat: bbox.north, lon: bbox.east },
    { lat: bbox.north, lon: bbox.west },
    { lat: bbox.south, lon: bbox.east },
    { lat: bbox.south, lon: bbox.west },
  ];
  return Math.ceil(
    Math.max(...corners.map((c) => distanceKm(center, c))) + 2,
  );
}

function catalogToBoundary(entry: DestinationSuggestion): IslandBoundary | null {
  if (!entry.islandBbox) return null;
  const center =
    entry.lat != null && entry.lon != null
      ? { lat: entry.lat, lon: entry.lon }
      : bboxCenter(entry.islandBbox);

  return {
    name: entry.name,
    bbox: entry.islandBbox,
    center,
    primaryAirports: entry.primaryAirports ?? [],
    maxRadiusKm: bboxMaxRadiusKm(entry.islandBbox, center),
  };
}

function labelMatchesEntry(label: string, entry: DestinationSuggestion): boolean {
  const n = normalizeSearchText(label);
  const name = normalizeSearchText(entry.name);
  if (n.startsWith(name) || n.includes(name)) return true;

  for (const alias of entry.aliases ?? []) {
    const a = normalizeSearchText(alias);
    if (n.includes(a) || a.includes(n.split(",")[0]?.trim() ?? "")) return true;
  }

  return false;
}

export function resolveIslandBoundary(
  destinationLabel: string | null | undefined,
): IslandBoundary | null {
  if (!destinationLabel?.trim()) return null;

  for (const entry of DESTINATION_CATALOG) {
    if (!entry.islandBbox) continue;
    if (labelMatchesEntry(destinationLabel, entry)) {
      return catalogToBoundary(entry);
    }
  }

  return null;
}

/** Gdy nazwa regionu nie zawiera wyspy (np. „Maspalomas”), wykryj wyspę po współrzędnych. */
export function resolveIslandBoundaryAtPoint(
  lat: number,
  lon: number,
): IslandBoundary | null {
  for (const entry of DESTINATION_CATALOG) {
    if (!entry.islandBbox) continue;
    if (pointInIslandBbox({ lat, lon }, entry.islandBbox)) {
      return catalogToBoundary(entry);
    }
  }
  return null;
}

export function resolveIslandBoundaryForSearch(
  destinationLabel: string | null | undefined,
  center?: GeoPoint | null,
): IslandBoundary | null {
  return (
    resolveIslandBoundary(destinationLabel) ??
    (center ? resolveIslandBoundaryAtPoint(center.lat, center.lon) : null)
  );
}

export function pointInIslandBbox(
  point: GeoPoint,
  bbox: BoundingBox,
  paddingDeg = 0,
): boolean {
  return (
    point.lat >= bbox.south - paddingDeg &&
    point.lat <= bbox.north + paddingDeg &&
    point.lon >= bbox.west - paddingDeg &&
    point.lon <= bbox.east + paddingDeg
  );
}

/** Reject clusters whose settlement clearly belongs to another island/region. */
export function settlementConflictsWithIsland(
  settlementName: string | undefined,
  boundary: IslandBoundary,
): boolean {
  if (!settlementName) return false;

  const islandKey = normalizeSearchText(boundary.name);
  const settlement = normalizeSearchText(settlementName);

  const otherIslands: Record<string, string[]> = {
    "gran canaria": [
      "lanzarote",
      "fuerteventura",
      "tenerife",
      "la gomera",
      "gomera",
      "la palma",
      "el hierro",
      "maroko",
      "morocco",
      "agadir",
      "melilla",
      "ceuta",
      "western sahara",
    ],
    teneryfa: [
      "lanzarote",
      "fuerteventura",
      "gran canaria",
      "la gomera",
      "la palma",
      "el hierro",
    ],
    lanzarote: [
      "fuerteventura",
      "gran canaria",
      "tenerife",
      "la gomera",
      "maroko",
      "morocco",
    ],
    fuerteventura: [
      "lanzarote",
      "gran canaria",
      "tenerife",
      "maroko",
      "morocco",
    ],
    majorka: ["menorca", "ibiza", "formentera"],
    kreta: ["santorini", "rodos", "athens", "atena"],
  };

  const blocked = otherIslands[islandKey] ?? [];
  return blocked.some((term) => settlement.includes(term));
}

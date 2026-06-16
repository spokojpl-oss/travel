import type { BoundingBox } from "@/types/domain";

export type ScrapeRegion = { name: string; bbox: BoundingBox };

export const SCRAPE_REGIONS: ScrapeRegion[] = [
  {
    name: "Iberia + Madeira + Canary",
    bbox: { north: 44, south: 27, east: 4, west: -19 },
  },
  { name: "France + Benelux", bbox: { north: 51.5, south: 42, east: 8, west: -5 } },
  { name: "Germany + Alps", bbox: { north: 55.5, south: 47, east: 16, west: 5 } },
  { name: "UK + Ireland", bbox: { north: 61, south: 49, east: 2, west: -11 } },
  { name: "Nordics", bbox: { north: 72, south: 55, east: 32, west: 4 } },
  { name: "Italy + Malta", bbox: { north: 47, south: 35, east: 19, west: 6 } },
  { name: "Balkans", bbox: { north: 47, south: 35, east: 30, west: 13 } },
  { name: "Greece + Cyprus", bbox: { north: 42, south: 34, east: 35, west: 19 } },
  { name: "Turkey", bbox: { north: 42, south: 36, east: 45, west: 25 } },
  { name: "Central Europe", bbox: { north: 55, south: 47, east: 25, west: 12 } },
  { name: "North Africa", bbox: { north: 37, south: 20, east: 36, west: -17 } },
  { name: "Middle East", bbox: { north: 38, south: 12, east: 60, west: 32 } },
  { name: "SE Asia", bbox: { north: 24, south: -11, east: 141, west: 92 } },
  {
    name: "Caribbean + Central America",
    bbox: { north: 25, south: 7, east: -60, west: -120 },
  },
  { name: "Poland + neighbors", bbox: { north: 56, south: 47, east: 25, west: 12 } },
];

/** Regiony scrape obejmujące destynacje z katalogu europejskiego. */
export const EUROPE_SCRAPE_REGIONS: string[] = [
  "Iberia + Madeira + Canary",
  "France + Benelux",
  "Germany + Alps",
  "UK + Ireland",
  "Nordics",
  "Italy + Malta",
  "Balkans",
  "Greece + Cyprus",
  "Turkey",
  "Central Europe",
  "Poland + neighbors",
];

export function scrapeRegionByName(name: string): ScrapeRegion | undefined {
  return SCRAPE_REGIONS.find((r) => r.name === name);
}

export function regionForPoint(lat: number, lon: number): string | null {
  for (const region of SCRAPE_REGIONS) {
    const { bbox } = region;
    if (
      lat >= bbox.south &&
      lat <= bbox.north &&
      lon >= bbox.west &&
      lon <= bbox.east
    ) {
      return region.name;
    }
  }
  return null;
}

export function bboxFromCenter(
  lat: number,
  lon: number,
  radiusKm: number,
): BoundingBox {
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    north: lat + latDelta,
    south: lat - latDelta,
    east: lon + lonDelta,
    west: lon - lonDelta,
  };
}

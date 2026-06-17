import type { BoundingBox } from "@/types/domain";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  nodes?: number[];
  members?: Array<{ type: string; ref: number; role?: string }>;
  geometry?: Array<{ lat: number; lon: number }>;
};

export type OverpassResponse = {
  elements: OverpassElement[];
};

export function buildCyclingNetworkQuery(bbox: BoundingBox): string {
  const { south, west, north, east } = bbox;
  return `
    [out:json][timeout:120];
    (
      relation["route"="bicycle"](${south},${west},${north},${east});
      relation["route"="mtb"](${south},${west},${north},${east});
    );
    out body;
    >;
    out skel qt;
  `;
}

export async function fetchCyclingNetwork(
  bbox: BoundingBox,
): Promise<OverpassResponse> {
  const overpassQuery = buildCyclingNetworkQuery(bbox);
  let lastError: Error | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `data=${encodeURIComponent(overpassQuery)}`,
        });

        if (
          response.status === 429 ||
          response.status === 503 ||
          response.status === 504
        ) {
          await sleep(2500 * (attempt + 1));
          continue;
        }

        if (!response.ok) {
          throw new Error(
            `OSM Overpass error: ${response.status} ${response.statusText}`,
          );
        }

        return (await response.json()) as OverpassResponse;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < 3) await sleep(1000 * (attempt + 1));
      }
    }
  }

  throw lastError ?? new Error("All Overpass endpoints failed");
}

export function mapNetworkToActivityType(
  tags: Record<string, string>,
): "cycling_road" | "cycling_mtb" {
  if (tags.route === "mtb") return "cycling_mtb";
  return "cycling_road";
}

export function buildRelationLineString(
  relation: OverpassElement,
  elementsById: Map<string, OverpassElement>,
): string | null {
  if (!relation.members?.length) return null;

  const coords: Array<{ lat: number; lon: number }> = [];

  for (const member of relation.members) {
    if (member.type !== "way") continue;
    const way = elementsById.get(`way/${member.ref}`);
    if (!way?.geometry?.length) continue;

    for (const point of way.geometry) {
      const last = coords[coords.length - 1];
      if (last && last.lat === point.lat && last.lon === point.lon) continue;
      coords.push(point);
    }
  }

  if (coords.length < 2) return null;

  return `LINESTRING(${coords.map((c) => `${c.lon} ${c.lat}`).join(", ")})`;
}

export function indexOverpassElements(
  elements: OverpassElement[],
): Map<string, OverpassElement> {
  const map = new Map<string, OverpassElement>();
  for (const el of elements) {
    map.set(`${el.type}/${el.id}`, el);
  }
  return map;
}

import type { AttractionWithActivities } from "@/types/domain";
import type { MapPoint, MapRouteSegment } from "@/lib/maps/types";

const MAX_MAP_ATTRACTIONS = 300;

export type IslandMapAirport = {
  iata_code: string;
  name: string;
  lat: number;
  lon: number;
};

export function buildIslandMapData({
  attractions,
  airports,
}: {
  attractions: AttractionWithActivities[];
  airports: IslandMapAirport[];
}): {
  points: MapPoint[];
  segments: MapRouteSegment[];
} {
  const points: MapPoint[] = [];

  for (const airport of airports) {
    points.push({
      id: `airport-${airport.iata_code}`,
      type: "airport",
      label: `${airport.name} (${airport.iata_code})`,
      lat: airport.lat,
      lon: airport.lon,
    });
  }

  const plotted = attractions.slice(0, MAX_MAP_ATTRACTIONS);
  for (const a of plotted) {
    points.push({
      id: a.id,
      type: "attraction",
      label: a.name.length > 32 ? `${a.name.slice(0, 32)}…` : a.name,
      lat: Number(a.lat),
      lon: Number(a.lon),
    });
  }

  return { points, segments: [] };
}

export function buildClusterMapDataWithAirports(
  clusterData: { points: MapPoint[]; segments: MapRouteSegment[] },
  airports: IslandMapAirport[],
): { points: MapPoint[]; segments: MapRouteSegment[] } {
  if (airports.length === 0) return clusterData;

  const airportPoints: MapPoint[] = airports.map((airport) => ({
    id: `airport-${airport.iata_code}`,
    type: "airport" as const,
    label: `${airport.name} (${airport.iata_code})`,
    lat: airport.lat,
    lon: airport.lon,
  }));

  return {
    points: [...airportPoints, ...clusterData.points],
    segments: clusterData.segments,
  };
}

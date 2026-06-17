export type GeoJsonPoint = {
  type: "Point";
  coordinates: [number, number];
};

export type GeoJsonLineString = {
  type: "LineString";
  coordinates: [number, number][];
};

export function pointGeoJson(lng: number, lat: number): GeoJsonPoint {
  return { type: "Point", coordinates: [lng, lat] };
}

export function lineStringGeoJson(
  points: Array<{ lng: number; lat: number }>,
): GeoJsonLineString | null {
  if (points.length < 2) return null;
  return {
    type: "LineString",
    coordinates: points.map((p) => [p.lng, p.lat]),
  };
}

export function wktLineStringToGeoJson(wkt: string): GeoJsonLineString | null {
  const match = wkt.match(/LINESTRING\s*\(([^)]+)\)/i);
  if (!match) return null;

  const coordinates = match[1]!
    .split(",")
    .map((pair) => {
      const [lng, lat] = pair.trim().split(/\s+/).map(Number);
      return [lng, lat] as [number, number];
    })
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));

  if (coordinates.length < 2) return null;
  return { type: "LineString", coordinates };
}

export function wktPointToGeoJson(wkt: string): GeoJsonPoint | null {
  const match = wkt.match(/POINT\s*\(([^)]+)\)/i);
  if (!match) return null;
  const [lng, lat] = match[1]!.trim().split(/\s+/).map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return pointGeoJson(lng, lat);
}

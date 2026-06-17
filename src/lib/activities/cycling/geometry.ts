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

/** PostgREST/PostGIS geography columns expect WKT (space-separated, no comma). */
export function pointWkt(lng: number, lat: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
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

export function lineStringWkt(
  coords: Array<[number, number]> | number[][],
): string | null {
  const pairs: string[] = [];
  for (const coord of coords) {
    const lng = coord[0];
    const lat = coord[1];
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    pairs.push(`${lng} ${lat}`);
  }
  if (pairs.length < 2) return null;
  return `SRID=4326;LINESTRING(${pairs.join(", ")})`;
}

export function wktLineStringToGeoJson(wkt: string): GeoJsonLineString | null {
  const normalized = wkt.replace(/^SRID=\d+;/i, "");
  const match = normalized.match(/LINESTRING\s*\(([^)]+)\)/i);
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
  const normalized = wkt.replace(/^SRID=\d+;/i, "");
  const match = normalized.match(/POINT\s*\(([^)]+)\)/i);
  if (!match) return null;
  const [lng, lat] = match[1]!.trim().split(/\s+/).map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return pointGeoJson(lng, lat);
}

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.trim();
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
  }
  return bytes;
}

/** Supabase often returns geography columns as EWKB hex strings. */
export function ewkbToGeoJson(value: string): GeoJsonPoint | GeoJsonLineString | null {
  if (!/^[0-9a-f]+$/i.test(value.trim())) return null;

  const bytes = hexToBytes(value);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  const littleEndian = view.getUint8(offset) === 1;
  offset += 1;

  const type = view.getUint32(offset, littleEndian);
  offset += 4;

  const hasSrid = (type & 0x20000000) !== 0;
  const hasZ = (type & 0x80000000) !== 0;
  const baseType = type & 0xff;

  if (hasSrid) offset += 4;

  const readPoint = (): [number, number] => {
    const lng = view.getFloat64(offset, littleEndian);
    offset += 8;
    const lat = view.getFloat64(offset, littleEndian);
    offset += 8;
    if (hasZ) offset += 8;
    return [lng, lat];
  };

  if (baseType === 1) {
    const coordinates = readPoint();
    return { type: "Point", coordinates };
  }

  if (baseType === 2) {
    const numPoints = view.getUint32(offset, littleEndian);
    offset += 4;
    const coordinates: [number, number][] = [];
    for (let i = 0; i < numPoints; i++) {
      coordinates.push(readPoint());
    }
    if (coordinates.length < 2) return null;
    return { type: "LineString", coordinates };
  }

  return null;
}

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

export function maxDistanceFromPointM(
  coordinates: number[][],
  lat: number,
  lng: number,
): number {
  let max = 0;
  for (const [pointLng, pointLat] of coordinates) {
    if (!Number.isFinite(pointLat) || !Number.isFinite(pointLng)) continue;
    max = Math.max(max, haversineM(lat, lng, pointLat, pointLng));
  }
  return max;
}

export function isPlausibleCyclingRoute({
  distanceM,
  targetDistanceKm,
  coordinates,
  startLat,
  startLng,
  maxRadiusKm = 35,
}: {
  distanceM: number;
  targetDistanceKm: number;
  coordinates: number[][];
  startLat: number;
  startLng: number;
  maxRadiusKm?: number;
}): boolean {
  const targetM = targetDistanceKm * 1000;
  if (distanceM > Math.max(220_000, targetM * 1.75)) return false;
  if (coordinates.length < 2) return false;

  const maxFromStart = maxDistanceFromPointM(coordinates, startLat, startLng);
  const allowedRadius = Math.max(
    maxRadiusKm * 1000,
    Math.min(targetM * 0.45 + 8_000, maxRadiusKm * 1000 + 5_000),
  );
  if (maxFromStart > allowedRadius) return false;

  return true;
}

export function isPlausibleStoredRoute(
  distanceM: number,
  coordinates: Array<{ lat: number; lng: number }>,
  centerLat: number,
  centerLng: number,
  maxRadiusKm = 35,
): boolean {
  if (distanceM > 250_000) return false;
  if (coordinates.length < 2) return false;

  const maxFromCenter = maxDistanceFromPointM(
    coordinates.map((p) => [p.lng, p.lat]),
    centerLat,
    centerLng,
  );
  return maxFromCenter <= maxRadiusKm * 1000;
}

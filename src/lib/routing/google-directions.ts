/** Dekoduje polyline z Google Directions API do [lat, lon]. */
export function decodeGooglePolyline(encoded: string): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

type DirectionsResponse = {
  status: string;
  routes?: Array<{
    overview_polyline?: { points?: string };
    legs?: Array<{
      distance?: { value: number };
      duration?: { value: number };
    }>;
  }>;
  error_message?: string;
};

export type GoogleDrivingRoute = {
  distance_km: number;
  duration_min: number;
  geometry: Array<[number, number]>;
  source: "google";
};

export async function fetchGoogleDrivingRoute(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  apiKey: string,
): Promise<GoogleDrivingRoute | null> {
  const params = new URLSearchParams({
    origin: `${from.lat},${from.lon}`,
    destination: `${to.lat},${to.lon}`,
    mode: "driving",
    key: apiKey,
    language: "pl",
    region: "pl",
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`,
    { next: { revalidate: 86400 } },
  );

  if (!response.ok) return null;

  const data = (await response.json()) as DirectionsResponse;
  if (data.status !== "OK" || !data.routes?.[0]) {
    return null;
  }

  const route = data.routes[0];
  const encoded = route.overview_polyline?.points;
  if (!encoded) return null;

  const leg = route.legs?.[0];
  const distanceM = leg?.distance?.value ?? 0;
  const durationS = leg?.duration?.value ?? 0;

  return {
    distance_km: Math.round((distanceM / 1000) * 10) / 10,
    duration_min: Math.max(1, Math.round(durationS / 60)),
    geometry: decodeGooglePolyline(encoded),
    source: "google",
  };
}

export async function fetchGoogleDrivingRoutes(
  segments: Array<{
    id: string;
    from: { lat: number; lon: number };
    to: { lat: number; lon: number };
  }>,
  apiKey: string,
): Promise<Array<{ id: string; route: GoogleDrivingRoute }>> {
  const results = await Promise.all(
    segments.map(async (segment) => {
      const route = await fetchGoogleDrivingRoute(
        segment.from,
        segment.to,
        apiKey,
      );
      return route ? { id: segment.id, route } : null;
    }),
  );
  return results.filter((r): r is { id: string; route: GoogleDrivingRoute } =>
    Boolean(r),
  );
}

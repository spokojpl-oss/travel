import type { GeoPoint } from "@/types/domain";

export function googleMapsDirectionsUrl(from: GeoPoint, to: GeoPoint): string {
  const params = new URLSearchParams({
    api: "1",
    origin: `${from.lat},${from.lon}`,
    destination: `${to.lat},${to.lon}`,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function googleMapsPlaceUrl(point: GeoPoint, label?: string): string {
  const params = new URLSearchParams({
    api: "1",
    query: label
      ? `${label}@${point.lat},${point.lon}`
      : `${point.lat},${point.lon}`,
  });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

export function getGoogleMapsApiKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return key || undefined;
}

export function getGoogleMapsServerKey(): string | undefined {
  const serverKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (serverKey) return serverKey;
  return getGoogleMapsApiKey();
}

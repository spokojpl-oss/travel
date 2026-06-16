import type { GeoPoint } from "@/types/domain";
import type { Locale } from "@/i18n/config";
import { DEFAULT_LOCALE } from "@/i18n/config";

function mapsLocale(locale: Locale = DEFAULT_LOCALE): Locale {
  return locale === "en" ? "en" : "pl";
}

export function googleMapsDirectionsUrl(
  from: GeoPoint,
  to: GeoPoint,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const params = new URLSearchParams({
    api: "1",
    origin: `${from.lat},${from.lon}`,
    destination: `${to.lat},${to.lon}`,
    travelmode: "driving",
    hl: mapsLocale(locale),
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function googleMapsPlaceUrl(
  point: GeoPoint,
  label?: string,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const params = new URLSearchParams({
    api: "1",
    query: label
      ? `${label}@${point.lat},${point.lon}`
      : `${point.lat},${point.lon}`,
    hl: mapsLocale(locale),
  });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

/** Dodaje hl=pl/en do linków z Google Places API. */
export function localizeGoogleMapsUrl(
  url: string,
  locale: Locale = DEFAULT_LOCALE,
): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("hl", mapsLocale(locale));
    return parsed.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}hl=${mapsLocale(locale)}`;
  }
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

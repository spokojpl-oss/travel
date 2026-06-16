import { fetchWithCache } from "@/lib/cache/api-cache";
import { toPolishPlaceName } from "@/lib/destinations/polish-names";
import type { GeoPoint } from "@/types/domain";

export type GeocodedSettlement = {
  name: string;
  lat: number;
  lon: number;
  country_code?: string;
};

const USER_AGENT = "Travel.app/1.0 (https://travel.mpai.pl)";
const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";
const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";

const REGION_LABELS = new Set([
  "mallorca",
  "majorca",
  "menorca",
  "ibiza",
  "formentera",
  "baleares",
  "balearic islands",
  "canary islands",
  "canarias",
  "spain",
  "españa",
  "greece",
  "grecja",
  "italy",
  "wlochy",
  "włochy",
  "france",
  "portugal",
  "croatia",
  "poland",
  "polska",
  "crete",
  "kreta",
  "europe",
  "europa",
]);

let nominatimChain: Promise<unknown> = Promise.resolve();

function withNominatimRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const run = nominatimChain.then(fn, fn);
  nominatimChain = run.then(
    () => new Promise((r) => setTimeout(r, 1100)),
    () => new Promise((r) => setTimeout(r, 1100)),
  );
  return run;
}

function snapCoord(value: number): number {
  return Math.round(value * 50) / 50;
}

function isRegionLabel(value: string): boolean {
  const n = value.trim().toLowerCase();
  return REGION_LABELS.has(n) || n.length <= 2;
}

function pickLocalityFromAddressRecord(
  addr: Record<string, string>,
): string | null {
  const candidates = [
    addr.city,
    addr.town,
    addr.village,
    addr.municipality,
    addr.hamlet,
    addr.suburb,
    addr.county,
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    if (isRegionLabel(raw)) continue;
    return toPolishPlaceName(raw);
  }
  return null;
}

function settlementFromNominatimResult({
  name,
  lat,
  lon,
  address,
}: {
  name: string;
  lat: number;
  lon: number;
  address?: Record<string, string>;
}): GeocodedSettlement | null {
  const locality =
    (address ? pickLocalityFromAddressRecord(address) : null) ?? name;
  if (!locality || isRegionLabel(locality)) return null;

  return {
    name: toPolishPlaceName(locality),
    lat,
    lon,
    country_code: address?.country_code?.toUpperCase(),
  };
}

export async function reverseGeocodeLocality(
  point: GeoPoint,
  zoom = 11,
): Promise<GeocodedSettlement | null> {
  const snapped = { lat: snapCoord(point.lat), lon: snapCoord(point.lon) };

  try {
    const { data } = await fetchWithCache<GeocodedSettlement | null>({
      source: "nominatim-reverse-locality",
      cacheParams: { lat: snapped.lat, lon: snapped.lon, zoom },
      ttlSeconds: 90 * 24 * 60 * 60,
      fetcher: () =>
        withNominatimRateLimit(async () => {
          const params = new URLSearchParams({
            lat: String(point.lat),
            lon: String(point.lon),
            format: "json",
            addressdetails: "1",
            zoom: String(zoom),
            "accept-language": "pl,en",
          });

          const response = await fetch(`${NOMINATIM_REVERSE}?${params}`, {
            headers: {
              "User-Agent": USER_AGENT,
              Accept: "application/json",
              "Accept-Language": "pl,en",
            },
          });

          if (!response.ok) return null;

          const json = (await response.json()) as {
            lat?: string;
            lon?: string;
            name?: string;
            address?: Record<string, string>;
          };

          return settlementFromNominatimResult({
            name: json.name ?? "",
            lat: Number(json.lat ?? point.lat),
            lon: Number(json.lon ?? point.lon),
            address: json.address,
          });
        }),
    });

    return data;
  } catch {
    return null;
  }
}

export async function forwardGeocodeSettlementName({
  name,
  countryHint,
  near,
}: {
  name: string;
  countryHint?: string;
  near?: GeoPoint;
}): Promise<GeocodedSettlement | null> {
  const query = countryHint ? `${name}, ${countryHint}` : name;

  try {
    const { data } = await fetchWithCache<GeocodedSettlement | null>({
      source: "nominatim-forward-settlement",
      cacheParams: {
        q: query.toLowerCase(),
        nearLat: near ? snapCoord(near.lat) : null,
        nearLon: near ? snapCoord(near.lon) : null,
      },
      ttlSeconds: 90 * 24 * 60 * 60,
      fetcher: () =>
        withNominatimRateLimit(async () => {
          const params = new URLSearchParams({
            q: query,
            format: "json",
            limit: "1",
            addressdetails: "1",
            "accept-language": "pl,en",
          });

          if (near) {
            params.set(
              "viewbox",
              [
                near.lon - 0.6,
                near.lat + 0.6,
                near.lon + 0.6,
                near.lat - 0.6,
              ].join(","),
            );
            params.set("bounded", "1");
          }

          const response = await fetch(`${NOMINATIM_SEARCH}?${params}`, {
            headers: {
              "User-Agent": USER_AGENT,
              Accept: "application/json",
              "Accept-Language": "pl,en",
            },
          });

          if (!response.ok) return null;

          const results = (await response.json()) as Array<{
            lat: string;
            lon: string;
            display_name?: string;
            address?: Record<string, string>;
          }>;

          const hit = results[0];
          if (!hit) return null;

          const locality =
            (hit.address ? pickLocalityFromAddressRecord(hit.address) : null) ??
            name;

          return settlementFromNominatimResult({
            name: locality,
            lat: Number(hit.lat),
            lon: Number(hit.lon),
            address: hit.address,
          });
        }),
    });

    return data;
  } catch {
    return null;
  }
}

import { createAdminClient } from "@/lib/supabase/admin";
import {
  DESTINATION_CATALOG,
  searchDestinationCatalog,
} from "@/lib/destinations/catalog";
import {
  geocodeQueryForDestination,
  matchCatalogDestination,
  toPolishPlaceName,
} from "@/lib/destinations/polish-names";
import { searchAirportCatalog, searchCountryOriginOptions } from "@/lib/flights/airport-catalog";

export type PlaceSuggestion = {
  id: string;
  label: string;
  sublabel?: string;
  type: "city" | "airport" | "destination";
  lat?: number;
  lon?: number;
  iata?: string;
  country_code?: string;
};

const COUNTRY_NAMES: Record<string, string> = {
  PL: "Polska",
  DE: "Niemcy",
  FR: "Francja",
  ES: "Hiszpania",
  IT: "Włochy",
  PT: "Portugalia",
  GR: "Grecja",
  HR: "Chorwacja",
  AL: "Albania",
  TR: "Turcja",
  CY: "Cypr",
  AT: "Austria",
  CZ: "Czechy",
  SK: "Słowacja",
  HU: "Węgry",
  GB: "Wielka Brytania",
  IE: "Irlandia",
  NL: "Holandia",
  BE: "Belgia",
  CH: "Szwajcaria",
  NO: "Norwegia",
  SE: "Szwecja",
  DK: "Dania",
  IS: "Islandia",
  US: "USA",
  CA: "Kanada",
  MX: "Meksyk",
  BR: "Brazylia",
  AR: "Argentyna",
  TH: "Tajlandia",
  VN: "Wietnam",
  ID: "Indonezja",
  JP: "Japonia",
  AU: "Australia",
  NZ: "Nowa Zelandia",
  EG: "Egipt",
  MA: "Maroko",
  TN: "Tunezja",
  AE: "ZEA",
  IL: "Izrael",
  IN: "Indie",
  ZA: "RPA",
};

function countryLabel(code: string | null | undefined): string {
  if (!code) return "";
  return COUNTRY_NAMES[code.toUpperCase()] ?? code;
}

async function searchNominatim(query: string, limit: number): Promise<PlaceSuggestion[]> {
  if (query.trim().length < 2) return [];

  const catalogMatch = matchCatalogDestination(query, DESTINATION_CATALOG);
  const geocodeQuery = geocodeQueryForDestination(query, catalogMatch);

  try {
    const params = new URLSearchParams({
      q: geocodeQuery,
      format: "json",
      limit: String(limit),
      addressdetails: "1",
      "accept-language": "pl",
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          "User-Agent": "Travel.app/1.0 (https://travel.mpai.pl)",
          Accept: "application/json",
          "Accept-Language": "pl",
        },
        next: { revalidate: 3600 },
      },
    );

    if (!response.ok) return [];

    const data = (await response.json()) as Array<{
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
      type?: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        country?: string;
        country_code?: string;
      };
    }>;

    return data.map((item) => {
      const addr = item.address ?? {};
      const rawCity =
        addr.city ?? addr.town ?? addr.village ?? item.display_name.split(",")[0];
      const city = toPolishPlaceName(rawCity?.trim() ?? item.display_name.split(",")[0]);
      const countryCode = addr.country_code?.toUpperCase();
      const country =
        (countryCode ? countryLabel(countryCode) : null) ??
        toPolishPlaceName(addr.country ?? "");
      const displayCountry =
        catalogMatch && countryCode && catalogMatch.country
          ? catalogMatch.country
          : country;
      const displayCity =
        catalogMatch &&
        catalogMatch.lat != null &&
        catalogMatch.lon != null &&
        Math.abs(Number(item.lat) - catalogMatch.lat) < 1.5 &&
        Math.abs(Number(item.lon) - catalogMatch.lon) < 1.5
          ? catalogMatch.name
          : city;
      return {
        id: `osm:${item.place_id}`,
        label: displayCity,
        sublabel: [addr.state ? toPolishPlaceName(addr.state) : null, displayCountry]
          .filter(Boolean)
          .join(", "),
        type: "city" as const,
        lat: Number(item.lat),
        lon: Number(item.lon),
        country_code: countryCode,
      };
    });
  } catch {
    return [];
  }
}

async function searchAirportsDb(
  query: string,
  limit: number,
): Promise<PlaceSuggestion[]> {
  const admin = createAdminClient();
  const q = query.trim();

  const countryOptions = searchCountryOriginOptions(q).map((c) => ({
    id: `country:${c.country_code}`,
    label: c.label,
    sublabel: `Wszystkie lotniska (${c.airport_count})`,
    type: "airport" as const,
    country_code: c.country_code,
  }));

  if (q.length < 1) {
    const airports = searchAirportCatalog("", limit).map((a) => ({
      id: `airport:${a.iata}`,
      label: a.name,
      sublabel: `${a.iata} · ${a.city ?? ""} · ${countryLabel(a.country_code)}`,
      type: "airport" as const,
      iata: a.iata,
      country_code: a.country_code,
    }));
    return dedupePlaces([...countryOptions, ...airports], limit);
  }

  const pattern = `%${q}%`;
  const { data, error } = await admin
    .from("airports")
    .select("iata_code, name, city, country_code, lat, lon, airport_type")
    .or(
      `name.ilike.${pattern},city.ilike.${pattern},iata_code.ilike.${pattern},country_code.ilike.${pattern}`,
    )
    .eq("scheduled_service", true)
    .order("airport_type", { ascending: true })
    .limit(limit);

  if (error || !data?.length) {
    const airports = searchAirportCatalog(q, limit).map((a) => ({
      id: `airport:${a.iata}`,
      label: a.name,
      sublabel: `${a.iata} · ${a.city ?? ""} · ${countryLabel(a.country_code)}`,
      type: "airport" as const,
      iata: a.iata,
      country_code: a.country_code,
    }));
    return dedupePlaces([...countryOptions, ...airports], limit);
  }

  const airports = data.map((row) => ({
    id: `airport:${row.iata_code}`,
    label: row.city
      ? `${toPolishPlaceName(row.city)} — ${row.name}`
      : row.name,
    sublabel: `${row.iata_code} · ${countryLabel(row.country_code)}`,
    type: "airport" as const,
    lat: Number(row.lat),
    lon: Number(row.lon),
    iata: row.iata_code,
    country_code: row.country_code,
  }));

  return dedupePlaces([...countryOptions, ...airports], limit);
}

async function searchDestinationsDb(
  query: string,
  limit: number,
): Promise<PlaceSuggestion[]> {
  const admin = createAdminClient();
  const q = query.trim();

  const catalog = searchDestinationCatalog(q, limit).map((d) => ({
    id: `dest:${d.name}-${d.country}`,
    label: d.name,
    sublabel: d.region ? `${d.region}, ${d.country}` : d.country,
    type: "destination" as const,
    lat: d.lat,
    lon: d.lon,
  }));

  if (q.length < 2) return catalog;

  const pattern = `%${q}%`;
  const { data } = await admin
    .from("destinations")
    .select("id, name, country_code, center_lat, center_lon")
    .or(`name.ilike.${pattern},country_code.ilike.${pattern}`)
    .limit(limit);

  const fromDb =
    data?.map((row) => ({
      id: `db:${row.id}`,
      label: toPolishPlaceName(row.name),
      sublabel: countryLabel(row.country_code),
      type: "destination" as const,
      lat: Number(row.center_lat),
      lon: Number(row.center_lon),
      country_code: row.country_code,
    })) ?? [];

  const seen = new Set<string>();
  const merged: PlaceSuggestion[] = [];
  for (const item of [...fromDb, ...catalog]) {
    const key = item.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= limit) break;
  }
  return merged;
}

function dedupePlaces(items: PlaceSuggestion[], limit: number): PlaceSuggestion[] {
  const seen = new Set<string>();
  const out: PlaceSuggestion[] = [];
  for (const item of items) {
    const key = `${item.type}:${item.label.toLowerCase()}:${item.sublabel ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

export async function searchPlaces(options: {
  query: string;
  type: "destination" | "airport";
  limit?: number;
}): Promise<PlaceSuggestion[]> {
  const limit = Math.min(options.limit ?? 12, 20);
  const q = options.query.trim();

  if (options.type === "airport") {
    return searchAirportsDb(q, limit);
  }

  const [catalog, nominatim, airportsAsCities] = await Promise.all([
    searchDestinationsDb(q, limit),
    searchNominatim(q, limit),
    q.length >= 2
      ? searchAirportsDb(q, Math.ceil(limit / 2))
      : Promise.resolve([]),
  ]);

  const airportCities: PlaceSuggestion[] = airportsAsCities
    .filter((a) => a.iata)
    .map((a) => ({
      id: `city-airport:${a.iata}`,
      label: a.label.split(" — ")[0] ?? a.label,
      sublabel: `${a.sublabel ?? ""} (lotnisko)`,
      type: "city" as const,
      lat: a.lat,
      lon: a.lon,
      iata: a.iata,
      country_code: a.country_code,
    }));

  return dedupePlaces([...catalog, ...nominatim, ...airportCities], limit);
}

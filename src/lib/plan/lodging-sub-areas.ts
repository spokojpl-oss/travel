import { distanceKm } from "@/lib/search/geo-clustering";
import {
  regionDisplayName,
  type TouristRegion,
} from "@/lib/destinations/tourist-regions";
import type { AttractionWithActivities, GeoPoint } from "@/types/domain";

export type LodgingAreaId = string;

export type LodgingAreaOption = {
  id: LodgingAreaId;
  lat: number;
  lon: number;
  name: string;
  description_pl: string;
  description_en: string;
  radiusKm: number;
  parentRegion: {
    id: string;
    name_pl: string;
    name_en: string;
    overview_pl: string;
    overview_en: string;
    stay_hint_pl: string;
    stay_hint_en: string;
  };
};

export type LodgingDistanceRow = {
  id: string;
  label: string;
  km: number;
  driveMinutes: number;
};

type ParsedStayPart = { name: string; description: string };

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[''`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(text: string): string {
  return normalizeForMatch(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function offsetPoint(
  origin: GeoPoint,
  bearingDeg: number,
  distKm: number,
): GeoPoint {
  const R = 6371;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (origin.lat * Math.PI) / 180;
  const lon1 = (origin.lon * Math.PI) / 180;
  const d = distKm / R;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
      Math.cos(lat1) * Math.sin(d) * Math.cos(brng),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { lat: (lat2 * 180) / Math.PI, lon: (lon2 * 180) / Math.PI };
}

function attractionPoint(a: AttractionWithActivities): GeoPoint {
  return { lat: Number(a.lat), lon: Number(a.lon) };
}

function settlementFromTags(a: AttractionWithActivities): string | null {
  const tags = a.tags;
  if (!tags || typeof tags !== "object" || Array.isArray(tags)) return null;
  const record = tags as Record<string, unknown>;
  const city = String(
    record["addr:city"] ??
      record["is_in:city"] ??
      record["is_in:town"] ??
      record["is_in:village"] ??
      "",
  ).trim();
  return city || null;
}

function centroidOf(points: GeoPoint[]): GeoPoint {
  if (points.length === 0) return { lat: 0, lon: 0 };
  return {
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
    lon: points.reduce((s, p) => s + p.lon, 0) / points.length,
  };
}

function splitNameList(text: string): string[] {
  return text
    .split(/\s+(?:lub|or|\/)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitNameDescription(segment: string): ParsedStayPart {
  const dashMatch = segment.match(/^(.+?)\s*[—–-]\s*(.+)$/);
  if (dashMatch) {
    return { name: dashMatch[1]!.trim(), description: dashMatch[2]!.trim() };
  }

  const prepMatch = segment.match(
    /^(.+?)\s+(na|dla|bliżej|przy|for|near|by|closer to)\s+(.+)$/i,
  );
  if (prepMatch) {
    return {
      name: prepMatch[1]!.trim(),
      description: `${prepMatch[2]!.toLowerCase()} ${prepMatch[3]!.trim()}`.trim(),
    };
  }

  return { name: segment.trim(), description: "" };
}

/** stay_hint → lista podregionów noclegowych (nazwa + krótki opis). */
export function parseStayHintParts(stayHint: string): ParsedStayPart[] {
  const segments = stayHint
    .split(/[;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0) return [];

  const parts: ParsedStayPart[] = [];

  for (const segment of segments) {
    const dashMatch = segment.match(/^(.+?)\s*[—–-]\s*(.+)$/);
    if (dashMatch) {
      const names = splitNameList(dashMatch[1]!.trim());
      const description = dashMatch[2]!.trim();
      for (const name of names.length > 0 ? names : [dashMatch[1]!.trim()]) {
        parts.push({ name, description });
      }
      continue;
    }

    if (/\s+(?:lub|or)\s+/i.test(segment)) {
      for (const name of splitNameList(segment)) {
        parts.push(splitNameDescription(name));
      }
      continue;
    }

    parts.push(splitNameDescription(segment));
  }

  const seen = new Set<string>();
  return parts.filter((part) => {
    const key = normalizeForMatch(part.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resolveSubAreaCoords(
  name: string,
  region: TouristRegion,
  attractions: AttractionWithActivities[],
  index: number,
  total: number,
): GeoPoint {
  const key = normalizeForMatch(name);
  const regionCenter = { lat: region.center_lat, lon: region.center_lon };

  const matched = attractions.filter((a) => {
    const n = normalizeForMatch(a.name);
    const city = settlementFromTags(a);
    return (
      n.includes(key) ||
      key.includes(n.split(" ")[0] ?? "") ||
      (city != null && normalizeForMatch(city).includes(key))
    );
  });

  if (matched.length > 0) {
    return centroidOf(matched.map(attractionPoint));
  }

  const spreadKm = Math.min(Math.max(region.radius_km ?? 6, 3), 12) * 0.35;
  const bearing = total <= 1 ? 0 : (360 / total) * index;
  return offsetPoint(regionCenter, bearing, spreadKm);
}

function subAreasForRegion(
  region: TouristRegion,
  attractions: AttractionWithActivities[],
  locale: "pl" | "en",
  stayRadiusKm?: number,
): LodgingAreaOption[] {
  const pl = locale !== "en";
  const stayHint = pl ? region.stay_hint_pl : region.stay_hint_en;
  const parsed = parseStayHintParts(stayHint);
  const mapRadiusKm = Math.min(
    Math.max(stayRadiusKm ?? region.radius_km ?? 5, 2),
    8,
  );

  const parentRegion = {
    id: region.id,
    name_pl: region.name_pl,
    name_en: region.name_en,
    overview_pl: region.overview_pl,
    overview_en: region.overview_en,
    stay_hint_pl: region.stay_hint_pl,
    stay_hint_en: region.stay_hint_en,
  };

  if (parsed.length >= 2) {
    return parsed.map((part, index) => {
      const coords = resolveSubAreaCoords(
        part.name,
        region,
        attractions,
        index,
        parsed.length,
      );
      return {
        id: `${region.id}--${slugify(part.name)}`,
        lat: coords.lat,
        lon: coords.lon,
        name: part.name,
        description_pl: part.description || region.stay_hint_pl,
        description_en: part.description || region.stay_hint_en,
        radiusKm: mapRadiusKm,
        parentRegion,
      };
    });
  }

  const regionName = regionDisplayName(region, locale);
  return [
    {
      id: region.id,
      lat: region.center_lat,
      lon: region.center_lon,
      name: regionName,
      description_pl: region.stay_hint_pl,
      description_en: region.stay_hint_en,
      radiusKm: Math.min(Math.max(region.radius_km ?? mapRadiusKm, mapRadiusKm), 12),
      parentRegion,
    },
  ];
}

export function computeLodgingAreaOptions(
  regions: TouristRegion[],
  options?: {
    attractions?: AttractionWithActivities[];
    locale?: "pl" | "en";
    stayRadiusKm?: number;
  },
): LodgingAreaOption[] {
  if (regions.length === 0) return [];

  const locale = options?.locale ?? "pl";
  const attractions = options?.attractions ?? [];

  if (regions.length === 1) {
    return subAreasForRegion(
      regions[0]!,
      attractions,
      locale,
      options?.stayRadiusKm,
    );
  }

  return regions.map((region) => {
    const pl = locale !== "en";
    const mapRadiusKm = Math.min(
      Math.max(options?.stayRadiusKm ?? region.radius_km ?? 5, 2),
      12,
    );
    return {
      id: region.id,
      lat: region.center_lat,
      lon: region.center_lon,
      name: regionDisplayName(region, locale),
      description_pl: region.stay_hint_pl,
      description_en: region.stay_hint_en,
      radiusKm: mapRadiusKm,
      parentRegion: {
        id: region.id,
        name_pl: region.name_pl,
        name_en: region.name_en,
        overview_pl: region.overview_pl,
        overview_en: region.overview_en,
        stay_hint_pl: region.stay_hint_pl,
        stay_hint_en: region.stay_hint_en,
      },
    };
  });
}

export function estimateDriveMinutes(km: number): number {
  return Math.max(1, Math.round(km * 1.35));
}

export function lodgingDistancesFromArea(
  area: LodgingAreaOption,
  attractions: AttractionWithActivities[],
  airports: Array<{ iata_code: string; name: string; lat: number; lon: number }>,
): {
  airports: LodgingDistanceRow[];
  attractions: LodgingDistanceRow[];
} {
  const origin = { lat: area.lat, lon: area.lon };

  return {
    airports: airports.map((airport) => {
      const km = distanceKm(origin, { lat: airport.lat, lon: airport.lon });
      return {
        id: airport.iata_code,
        label: `${airport.name} (${airport.iata_code})`,
        km,
        driveMinutes: estimateDriveMinutes(km),
      };
    }),
    attractions: attractions.map((a) => {
      const km = distanceKm(origin, attractionPoint(a));
      return {
        id: a.id,
        label: a.name,
        km,
        driveMinutes: estimateDriveMinutes(km),
      };
    }),
  };
}

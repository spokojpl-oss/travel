import { distanceKm } from "@/lib/search/geo-clustering";
import { toPolishAttractionName } from "@/lib/plan/attraction-display-name";
import type { AttractionWithActivities, GeoPoint } from "@/types/domain";

export type LodgingBaseChoice = "tourist_center" | "quiet_area";

export type LodgingBaseOption = {
  choice: LodgingBaseChoice;
  lat: number;
  lon: number;
  label: string;
  hint_pl: string;
  hint_en: string;
};

function computeCentroid(points: GeoPoint[]): GeoPoint {
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lon = points.reduce((s, p) => s + p.lon, 0) / points.length;
  return { lat, lon };
}

function attractionPoint(a: AttractionWithActivities): GeoPoint {
  return { lat: Number(a.lat), lon: Number(a.lon) };
}

function findDensityPeak(attractions: AttractionWithActivities[]): GeoPoint {
  if (attractions.length === 1) return attractionPoint(attractions[0]);

  const cellDeg = 0.04;
  const cells = new Map<string, { point: GeoPoint; count: number }>();

  for (const a of attractions) {
    const p = attractionPoint(a);
    const key = `${Math.floor(p.lat / cellDeg)}:${Math.floor(p.lon / cellDeg)}`;
    const existing = cells.get(key);
    if (existing) {
      existing.count += 1;
      existing.point = {
        lat: (existing.point.lat * (existing.count - 1) + p.lat) / existing.count,
        lon: (existing.point.lon * (existing.count - 1) + p.lon) / existing.count,
      };
    } else {
      cells.set(key, { point: p, count: 1 });
    }
  }

  const best = [...cells.values()].sort((a, b) => b.count - a.count)[0];
  return best?.point ?? computeCentroid(attractions.map(attractionPoint));
}

function nearestLocalityLabel(
  point: GeoPoint,
  attractions: AttractionWithActivities[],
): string {
  const sorted = [...attractions].sort(
    (a, b) =>
      distanceKm(point, attractionPoint(a)) -
      distanceKm(point, attractionPoint(b)),
  );
  const nearest = sorted[0];
  if (!nearest) return "Wybrany rejon";
  return toPolishAttractionName(nearest.name).split("—")[0]?.trim() ?? nearest.name;
}

export function computeLodgingBaseOptions(
  attractions: AttractionWithActivities[],
  options?: { withKids?: boolean; locale?: "pl" | "en" },
): LodgingBaseOption[] {
  if (attractions.length === 0) return [];

  const withKids = options?.withKids ?? false;
  const touristPoint = findDensityPeak(attractions);

  const quietCandidate = [...attractions]
    .map((a) => ({ a, d: distanceKm(touristPoint, attractionPoint(a)) }))
    .sort((x, y) => y.d - x.d)[0];

  const quietPoint = quietCandidate
    ? attractionPoint(quietCandidate.a)
    : touristPoint;

  const touristLabel = `Centrum — okolica ${nearestLocalityLabel(touristPoint, attractions)}`;
  const quietLabel = `Spokojniej — okolica ${nearestLocalityLabel(quietPoint, attractions)}`;

  const touristHintPl = withKids
    ? "Blisko plaż i restauracji, ale więcej ruchu i hałasu — krótsze dojazdy do atrakcji."
    : "Blisko plaż, barów i życia nocnego — krótkie dojazdy do atrakcji.";
  const quietHintPl = withKids
    ? "Ciszej i mniej tłumów — lepsze na sen dzieci; do plaż i atrakcji dojedziesz autem."
    : "Spokojniejsza okolica, mniej tłumów — do atrakcji dojedziesz autem.";

  return [
    {
      choice: "tourist_center",
      lat: touristPoint.lat,
      lon: touristPoint.lon,
      label: touristLabel,
      hint_pl: touristHintPl,
      hint_en: withKids
        ? "Near beaches and restaurants but busier — shorter drives to sights."
        : "Near beaches, bars and nightlife — shorter drives to sights.",
    },
    {
      choice: "quiet_area",
      lat: quietPoint.lat,
      lon: quietPoint.lon,
      label: quietLabel,
      hint_pl: quietHintPl,
      hint_en: withKids
        ? "Quieter and less crowded — better for kids' sleep; drive to sights."
        : "Quieter area, fewer crowds — drive to sights.",
    },
  ];
}

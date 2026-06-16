import { distanceKm } from "@/lib/search/geo-clustering";
import { clusterDisplayName } from "@/lib/search/settlement-resolver";
import { isCompactIslandDestination } from "@/lib/search/destination-size";
import type {
  AttractionWithActivities,
  GeoCluster,
  GeoPoint,
} from "@/types/domain";

export type LodgingBaseChoice = "tourist_center" | "quiet_area";

export type LodgingBaseOption = {
  choice: LodgingBaseChoice;
  lat: number;
  lon: number;
  label: string;
  hint_pl: string;
  hint_en: string;
  /** Promień okolicy bazy na mapie (km). */
  radiusKm: number;
};

function attractionPoint(a: AttractionWithActivities): GeoPoint {
  return { lat: Number(a.lat), lon: Number(a.lon) };
}

function centroidOf(points: GeoPoint[]): GeoPoint {
  if (points.length === 0) return { lat: 0, lon: 0 };
  return {
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
    lon: points.reduce((s, p) => s + p.lon, 0) / points.length,
  };
}

const BEACH_SLUGS = new Set(["sandy_beaches", "rocky_beaches"]);

const CULTURAL_SLUGS = new Set([
  "castles",
  "archaeology",
  "old_towns",
  "museums",
  "viewpoints",
]);

function isCoastalAttraction(a: AttractionWithActivities): boolean {
  const slugs = a.activity_tags.map((t) => t.activity_slug);
  if (slugs.some((s) => BEACH_SLUGS.has(s))) return true;
  return /plaż|beach|port|marina|nabrze|promenade|bay|zatok/i.test(a.name);
}

function isCulturalAttraction(a: AttractionWithActivities): boolean {
  const slugs = a.activity_tags.map((t) => t.activity_slug);
  return slugs.some((s) => CULTURAL_SLUGS.has(s));
}

function settlementHintNear(
  point: GeoPoint,
  attractions: AttractionWithActivities[],
): string | null {
  let best: { name: string; dist: number } | null = null;

  for (const a of attractions) {
    const tags = a.tags;
    if (!tags || typeof tags !== "object" || Array.isArray(tags)) continue;
    const record = tags as Record<string, unknown>;
    const city =
      String(
        record["addr:city"] ??
          record["is_in:city"] ??
          record["is_in:town"] ??
          record["is_in:village"] ??
          "",
      ).trim() || null;
    if (!city) continue;
    const dist = distanceKm(point, attractionPoint(a));
    if (!best || dist < best.dist) best = { name: city, dist };
  }

  return best && best.dist < 12 ? best.name : null;
}

/** Centrum: osiedla, zamki, muzea — nie plaże z całej wyspy. */
function computeUrbanCenter(
  cluster: GeoCluster,
  pool: AttractionWithActivities[],
): { point: GeoPoint; name: string } {
  if (cluster.settlement?.name) {
    return {
      point: {
        lat: cluster.settlement.lat,
        lon: cluster.settlement.lon,
      },
      name: cluster.settlement.name,
    };
  }

  const cultural = pool.filter((a) => isCulturalAttraction(a) && !isCoastalAttraction(a));
  if (cultural.length >= 2) {
    const point = centroidOf(cultural.map(attractionPoint));
    const hint = settlementHintNear(point, cultural) ?? clusterDisplayName(cluster);
    return {
      point,
      name: hint !== "Region do wyboru" ? hint : "Centrum",
    };
  }

  const inland = pool.filter((a) => !isCoastalAttraction(a));
  if (inland.length >= 2) {
    const point = centroidOf(inland.map(attractionPoint));
    const hint = settlementHintNear(point, inland) ?? clusterDisplayName(cluster);
    return {
      point,
      name: hint !== "Region do wyboru" ? hint : "Centrum",
    };
  }

  const displayName = clusterDisplayName({ ...cluster, attractions: pool });
  if (displayName !== "Region do wyboru") {
    return { point: cluster.center, name: displayName };
  }

  return { point: cluster.center, name: "Centrum" };
}

/** Nabrzeże: plaże najdalej od centrum — na małej wyspie to inny koniec niż Valletta. */
function computeWaterfrontCenter(
  urbanCenter: GeoPoint,
  pool: AttractionWithActivities[],
  minSepKm: number,
): GeoPoint | null {
  const coastal = pool
    .filter(isCoastalAttraction)
    .map((a) => ({ p: attractionPoint(a), a }))
    .filter(({ p }) => distanceKm(urbanCenter, p) <= 45);

  if (coastal.length === 0) return null;

  coastal.sort(
    (x, y) => distanceKm(urbanCenter, y.p) - distanceKm(urbanCenter, x.p),
  );

  const groupSize = Math.max(1, Math.ceil(coastal.length * 0.3));
  const furthest = coastal.slice(0, groupSize);
  let point = centroidOf(furthest.map((x) => x.p));

  if (distanceKm(urbanCenter, point) < minSepKm) {
    point = furthest[0]!.p;
  }

  if (distanceKm(urbanCenter, point) < minSepKm * 0.5) {
    return null;
  }

  return point;
}

function waterfrontLabel(
  waterfront: GeoPoint,
  pool: AttractionWithActivities[],
  pl: boolean,
): string {
  const hint = settlementHintNear(
    waterfront,
    pool.filter(isCoastalAttraction),
  );
  if (hint) {
    return pl ? `${hint} — przy plaży` : `${hint} — by the beach`;
  }
  return pl ? "Nabrzeże / plaże" : "Coast / beaches";
}

export function computeLodgingBaseOptions(
  attractions: AttractionWithActivities[],
  options?: {
    withKids?: boolean;
    locale?: "pl" | "en";
    cluster?: GeoCluster;
    destinationLabel?: string | null;
    stayRadiusKm?: number;
  },
): LodgingBaseOption[] {
  if (attractions.length === 0 && !options?.cluster) return [];

  const cluster = options?.cluster ?? {
    id: "tmp",
    center: attractions[0]
      ? attractionPoint(attractions[0])
      : { lat: 0, lon: 0 },
    bbox: { north: 0, south: 0, east: 0, west: 0 },
    radius_km: 10,
    attractions,
    covered_activities: [],
    score: 1,
    activity_counts: {},
  };

  const pool = attractions.length > 0 ? attractions : cluster.attractions;
  const withKids = options?.withKids ?? false;
  const pl = options?.locale !== "en";
  const compact = isCompactIslandDestination(options?.destinationLabel);
  const minSepKm = compact ? 3 : 1.5;
  const mapRadiusKm = Math.min(
    Math.max(options?.stayRadiusKm ?? (compact ? 4 : 6), 3),
    compact ? 5 : 8,
  );

  const { point: urbanCenter, name: urbanName } = computeUrbanCenter(
    cluster,
    pool,
  );
  const waterfront = computeWaterfrontCenter(urbanCenter, pool, minSepKm);

  if (!waterfront) {
    return [
      {
        choice: "quiet_area",
        lat: urbanCenter.lat,
        lon: urbanCenter.lon,
        radiusKm: mapRadiusKm,
        label: pl ? `${urbanName} — baza noclegowa` : `${urbanName} — lodging base`,
        hint_pl: withKids
          ? "Jedna sensowna baza na wyspie — hotele w okolicy centrum."
          : "Jedna baza — centrum lub najlepsza lokalizacja względem atrakcji.",
        hint_en: withKids
          ? "One practical base on the island — hotels near the centre."
          : "Single base — centre or best fit for your picks.",
      },
    ];
  }

  const waterfrontDist = distanceKm(urbanCenter, waterfront);
  const beachAreaName = waterfrontLabel(waterfront, pool, pl);

  const touristHintPl = withKids
    ? `Ok. ${waterfrontDist.toFixed(0)} km od centrum — bliżej plaży, krótszy dojazd nad morze z dziećmi.`
    : `Ok. ${waterfrontDist.toFixed(0)} km od centrum — przy plaży / porcie, wieczorny ruch nad wodą.`;
  const quietHintPl = withKids
    ? `Ok. ${waterfrontDist.toFixed(0)} km od nabrzeża — ciszej w nocy, sklepy i restauracje pod ręką.`
    : `Ok. ${waterfrontDist.toFixed(0)} km od nabrzeża — centrum, mniej hałasu niż przy samej plaży.`;

  return [
    {
      choice: "tourist_center",
      lat: waterfront.lat,
      lon: waterfront.lon,
      radiusKm: mapRadiusKm,
      label: beachAreaName,
      hint_pl: touristHintPl,
      hint_en: withKids
        ? `~${waterfrontDist.toFixed(0)} km from centre — closer to beaches for kids.`
        : `~${waterfrontDist.toFixed(0)} km from centre — waterfront, busier evenings.`,
    },
    {
      choice: "quiet_area",
      lat: urbanCenter.lat,
      lon: urbanCenter.lon,
      radiusKm: mapRadiusKm,
      label: pl ? `${urbanName} — centrum` : `${urbanName} — city centre`,
      hint_pl: quietHintPl,
      hint_en: withKids
        ? `~${waterfrontDist.toFixed(0)} km from coast — quieter nights, shops nearby.`
        : `~${waterfrontDist.toFixed(0)} km from coast — town centre, calmer than the beach strip.`,
    },
  ];
}

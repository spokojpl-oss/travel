import { distanceKm } from "@/lib/search/geo-clustering";
import { clusterDisplayName } from "@/lib/search/settlement-resolver";
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
};

function attractionPoint(a: AttractionWithActivities): GeoPoint {
  return { lat: Number(a.lat), lon: Number(a.lon) };
}

const BEACH_SLUGS = new Set(["sandy_beaches", "rocky_beaches"]);

function isCoastalAttraction(a: AttractionWithActivities): boolean {
  const slugs = a.activity_tags.map((t) => t.activity_slug);
  if (slugs.some((s) => BEACH_SLUGS.has(s))) return true;
  return /plaż|beach|port|marina|nabrze/i.test(a.name);
}

/** Nabrzeże: centroid najbliższych punktów nad morzem względem centrum miasta. */
function computeWaterfrontPoint(
  cityCenter: GeoPoint,
  attractions: AttractionWithActivities[],
  maxKm = 18,
): GeoPoint | null {
  const coastal = attractions
    .filter(isCoastalAttraction)
    .map((a) => ({ p: attractionPoint(a), a }))
    .filter(({ p }) => distanceKm(cityCenter, p) <= maxKm)
    .sort(
      (x, y) =>
        distanceKm(cityCenter, x.p) - distanceKm(cityCenter, y.p),
    );

  if (coastal.length === 0) return null;

  const nearest = coastal.slice(0, Math.min(5, coastal.length));
  const lat =
    nearest.reduce((s, x) => s + x.p.lat, 0) / nearest.length;
  const lon =
    nearest.reduce((s, x) => s + x.p.lon, 0) / nearest.length;
  return { lat, lon };
}

function resolveCityCenter(
  cluster: GeoCluster,
  attractions: AttractionWithActivities[],
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

  const displayName = clusterDisplayName({ ...cluster, attractions });
  if (displayName !== "Region do wyboru") {
    return { point: cluster.center, name: displayName };
  }

  return { point: cluster.center, name: "Centrum" };
}

export function computeLodgingBaseOptions(
  attractions: AttractionWithActivities[],
  options?: {
    withKids?: boolean;
    locale?: "pl" | "en";
    cluster?: GeoCluster;
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

  const { point: cityCenter, name: cityName } = resolveCityCenter(
    cluster,
    pool,
  );
  const waterfront =
    computeWaterfrontPoint(cityCenter, pool) ??
    (pool.find(isCoastalAttraction)
      ? attractionPoint(pool.find(isCoastalAttraction)!)
      : null);

  const waterfrontPoint = waterfront ?? cityCenter;
  const waterfrontDist = distanceKm(cityCenter, waterfrontPoint);
  const sameSpot = waterfrontDist < 0.8;

  const touristLabel = sameSpot
    ? pl
      ? `${cityName} — centrum i nabrzeże`
      : `${cityName} — centre & waterfront`
    : pl
      ? `${cityName} — przy nabrzeżu`
      : `${cityName} — waterfront`;

  const quietLabel = pl
    ? `${cityName} — centrum miasta`
    : `${cityName} — city centre`;

  const touristHintPl = withKids
    ? "Blisko plaży i promenady — wygodne wyjścia nad morze z dziećmi."
    : "Przy plaży / porcie — krótki dojście nad wodę, więcej ruchu wieczorem.";
  const quietHintPl = withKids
    ? "Centrum miejscowości — ciszej w nocy, do plaży dojedziesz autem (kilka–kilkanaście minut)."
    : "Centrum — sklepy, restauracje, mniej hałasu niż przy samej plaży.";

  return [
    {
      choice: "tourist_center",
      lat: waterfrontPoint.lat,
      lon: waterfrontPoint.lon,
      label: touristLabel,
      hint_pl: touristHintPl,
      hint_en: withKids
        ? "Near beach and promenade — easy sea access with kids."
        : "Waterfront — short walk to the sea, busier evenings.",
    },
    {
      choice: "quiet_area",
      lat: cityCenter.lat,
      lon: cityCenter.lon,
      label: quietLabel,
      hint_pl: quietHintPl,
      hint_en: withKids
        ? "Town centre — quieter nights, short drive to beaches."
        : "Town centre — shops and restaurants, calmer than the beach strip.",
    },
  ];
}

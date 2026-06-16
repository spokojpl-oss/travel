import { toPolishPlaceName } from "@/lib/destinations/polish-names";
import { distanceKm } from "@/lib/search/geo-clustering";
import {
  forwardGeocodeSettlementName,
  reverseGeocodeLocality,
} from "@/lib/search/nominatim-settlement";
import type {
  AttractionWithActivities,
  GeoCluster,
  GeoPoint,
} from "@/types/domain";

export type ClusterSettlement = {
  name: string;
  lat: number;
  lon: number;
  country_code?: string;
};

type SettlementVote = {
  name: string;
  country_code?: string;
  point: GeoPoint;
  weight: number;
};

const REGION_SUFFIXES = new Set([
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

const COUNTRY_NAMES: Record<string, string> = {
  GR: "Greece",
  ES: "Spain",
  IT: "Italy",
  FR: "France",
  PT: "Portugal",
  HR: "Croatia",
  PL: "Poland",
  DE: "Germany",
  TR: "Turkey",
};

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function isRegionLabel(value: string): boolean {
  const n = normalizeName(value);
  return REGION_SUFFIXES.has(n) || n.length <= 2;
}

function parseTagsRecord(
  tags: AttractionWithActivities["tags"],
): Record<string, string> {
  if (!tags || typeof tags !== "object" || Array.isArray(tags)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tags)) {
    if (typeof value === "string" && value.trim()) out[key] = value.trim();
  }
  return out;
}

function extractCountryFromTags(tags: Record<string, string>): string | undefined {
  const code =
    tags["addr:country"] ??
    tags["ISO3166-1"] ??
    tags["is_in:country_code"];
  if (code && code.length === 2) return code.toUpperCase();
  return undefined;
}

function firstLocalityFromIsIn(value: string): string | null {
  const part = value.split(",")[0]?.trim();
  if (!part || isRegionLabel(part)) return null;
  return toPolishPlaceName(part);
}

function extractSettlementFromTags(
  tags: Record<string, string>,
): { name: string; country_code?: string } | null {
  const candidates = [
    tags["addr:city"],
    tags["addr:town"],
    tags["addr:village"],
    tags["addr:hamlet"],
    tags["addr:place"],
    tags["addr:suburb"],
    tags["is_in:city"],
    tags["is_in:town"],
    tags["is_in:village"],
    tags["is_in:hamlet"],
    tags["is_in:municipality"],
    tags["is_in:suburb"],
    tags["is_in:place"],
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    if (isRegionLabel(raw)) continue;
    return {
      name: toPolishPlaceName(raw),
      country_code: extractCountryFromTags(tags),
    };
  }

  if (tags["is_in"]) {
    const fromIsIn = firstLocalityFromIsIn(tags["is_in"]);
    if (fromIsIn) {
      return {
        name: fromIsIn,
        country_code: extractCountryFromTags(tags),
      };
    }
  }

  return null;
}

function extractSettlementFromAddress(
  address: string,
): { name: string; country_code?: string } | null {
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  for (let i = parts.length - 2; i >= 0; i--) {
    const part = parts[i];
    if (!part || isRegionLabel(part)) continue;
    if (/^\d{2,5}(-\d+)?$/.test(part)) continue;
    const last = parts[parts.length - 1];
    return {
      name: toPolishPlaceName(part),
      country_code: last?.length === 2 ? last.toUpperCase() : undefined,
    };
  }
  return null;
}

function voteFromAttraction(
  attraction: AttractionWithActivities,
  weight: number,
): SettlementVote | null {
  const tags = parseTagsRecord(attraction.tags);
  const fromTags = extractSettlementFromTags(tags);
  if (fromTags) {
    return {
      name: fromTags.name,
      country_code: fromTags.country_code,
      point: { lat: Number(attraction.lat), lon: Number(attraction.lon) },
      weight,
    };
  }

  if (attraction.address) {
    const fromAddress = extractSettlementFromAddress(attraction.address);
    if (fromAddress) {
      return {
        name: fromAddress.name,
        country_code: fromAddress.country_code,
        point: { lat: Number(attraction.lat), lon: Number(attraction.lon) },
        weight,
      };
    }
  }

  return null;
}

function pickSettlementFromVotes(
  votes: SettlementVote[],
): ClusterSettlement | null {
  if (votes.length === 0) return null;

  const byName = new Map<
    string,
    { name: string; country_code?: string; points: GeoPoint[]; weight: number }
  >();

  for (const vote of votes) {
    const key = normalizeName(vote.name);
    const existing = byName.get(key);
    if (existing) {
      existing.points.push(vote.point);
      existing.weight += vote.weight;
      existing.country_code ??= vote.country_code;
    } else {
      byName.set(key, {
        name: vote.name,
        country_code: vote.country_code,
        points: [vote.point],
        weight: vote.weight,
      });
    }
  }

  const winner = [...byName.values()].sort((a, b) => b.weight - a.weight)[0];
  if (!winner) return null;

  const lat =
    winner.points.reduce((s, p) => s + p.lat, 0) / winner.points.length;
  const lon =
    winner.points.reduce((s, p) => s + p.lon, 0) / winner.points.length;

  return {
    name: winner.name,
    lat,
    lon,
    country_code: winner.country_code,
  };
}

async function resolveSettlementCoords(
  name: string,
  near: GeoPoint,
  countryCode?: string,
): Promise<ClusterSettlement | null> {
  const countryHint = countryCode ? COUNTRY_NAMES[countryCode] : undefined;
  const geocoded = await forwardGeocodeSettlementName({
    name,
    countryHint,
    near,
  });
  if (geocoded) return geocoded;

  return reverseGeocodeLocality(near);
}

export async function resolveClusterSettlement(
  cluster: GeoCluster,
): Promise<ClusterSettlement | null> {
  const centroid = cluster.center;

  const votes: SettlementVote[] = [];
  for (const attraction of cluster.attractions) {
    const vote = voteFromAttraction(attraction, 1);
    if (vote) votes.push(vote);
  }

  const fromTags = pickSettlementFromVotes(votes);
  if (fromTags) {
    const resolved = await resolveSettlementCoords(
      fromTags.name,
      centroid,
      fromTags.country_code,
    );
    if (resolved) return resolved;
  }

  const sorted = [...cluster.attractions].sort(
    (a, b) =>
      distanceKm(centroid, { lat: Number(a.lat), lon: Number(a.lon) }) -
      distanceKm(centroid, { lat: Number(b.lat), lon: Number(b.lon) }),
  );

  const reversed = await reverseGeocodeLocality(centroid);
  if (reversed) return reversed;

  const nearest = sorted[0];
  if (nearest) {
    return reverseGeocodeLocality({
      lat: Number(nearest.lat),
      lon: Number(nearest.lon),
    });
  }

  return null;
}

export async function enrichClusterWithSettlement(
  cluster: GeoCluster,
): Promise<GeoCluster> {
  if (cluster.settlement?.name) {
    return applySettlementToCluster(cluster, cluster.settlement);
  }

  const settlement = await resolveClusterSettlement(cluster);
  if (!settlement) return cluster;

  return applySettlementToCluster(cluster, settlement);
}

function applySettlementToCluster(
  cluster: GeoCluster,
  settlement: ClusterSettlement,
): GeoCluster {
  const center = { lat: settlement.lat, lon: settlement.lon };
  const radius_km = Math.max(
    ...cluster.attractions.map((a) =>
      distanceKm(center, { lat: Number(a.lat), lon: Number(a.lon) }),
    ),
    0.1,
  );

  return {
    ...cluster,
    settlement,
    center,
    radius_km: Math.round(radius_km * 10) / 10,
    attractions: [...cluster.attractions].sort(
      (a, b) =>
        distanceKm(center, { lat: Number(a.lat), lon: Number(a.lon) }) -
        distanceKm(center, { lat: Number(b.lat), lon: Number(b.lon) }),
    ),
  };
}

export function clusterDisplayName(cluster: GeoCluster): string {
  if (cluster.settlement?.name) return cluster.settlement.name;

  for (const attraction of cluster.attractions) {
    const tags = parseTagsRecord(attraction.tags);
    const fromTags = extractSettlementFromTags(tags);
    if (fromTags) return fromTags.name;

    if (attraction.address) {
      const fromAddress = extractSettlementFromAddress(attraction.address);
      if (fromAddress) return fromAddress.name;
    }
  }

  return "Region do wyboru";
}

export async function enrichClustersWithSettlements(
  clusters: GeoCluster[],
): Promise<GeoCluster[]> {
  const out: GeoCluster[] = [];
  for (const cluster of clusters) {
    out.push(await enrichClusterWithSettlement(cluster));
  }
  return out;
}

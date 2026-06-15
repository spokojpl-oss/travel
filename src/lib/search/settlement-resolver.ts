import { toPolishPlaceName } from "@/lib/destinations/polish-names";
import { distanceKm } from "@/lib/search/geo-clustering";
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
  "italy",
  "france",
  "portugal",
  "croatia",
  "poland",
  "polska",
]);

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

function extractSettlementFromTags(
  tags: Record<string, string>,
): { name: string; country_code?: string } | null {
  const candidates = [
    tags["addr:city"],
    tags["addr:place"],
    tags["is_in:city"],
    tags["is_in:town"],
    tags["is_in:municipality"],
    tags["is_in:village"],
    tags["is_in:hamlet"],
    tags["is_in:suburb"],
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    if (isRegionLabel(raw)) continue;
    return {
      name: toPolishPlaceName(raw),
      country_code: extractCountryFromTags(tags),
    };
  }
  return null;
}

function extractSettlementFromAddress(
  address: string,
): { name: string } | null {
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  for (let i = parts.length - 2; i >= 0; i--) {
    const part = parts[i];
    if (!part || isRegionLabel(part)) continue;
    if (/^\d{2,5}(-\d+)?$/.test(part)) continue;
    return { name: toPolishPlaceName(part) };
  }
  return null;
}

function extractCountryFromAddress(address: string): string | undefined {
  const last = address.split(",").pop()?.trim();
  if (last && last.length === 2) return last.toUpperCase();
  return undefined;
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
        country_code: extractCountryFromAddress(attraction.address),
        point: { lat: Number(attraction.lat), lon: Number(attraction.lon) },
        weight,
      };
    }
  }

  return null;
}

function pickSettlementFromVotes(votes: SettlementVote[]): ClusterSettlement | null {
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

async function reverseGeocodeSettlement(
  point: GeoPoint,
): Promise<ClusterSettlement | null> {
  try {
    const params = new URLSearchParams({
      lat: String(point.lat),
      lon: String(point.lon),
      format: "json",
      addressdetails: "1",
      zoom: "14",
      "accept-language": "pl",
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params}`,
      {
        headers: {
          "User-Agent": "Travel.app/1.0 (https://travel.mpai.pl)",
          Accept: "application/json",
          "Accept-Language": "pl",
        },
        next: { revalidate: 86400 },
      },
    );

    if (!response.ok) return null;

    const data = (await response.json()) as {
      lat?: string;
      lon?: string;
      address?: Record<string, string>;
    };

    const addr = data.address ?? {};
    const candidates = [
      addr.city,
      addr.town,
      addr.village,
      addr.municipality,
      addr.hamlet,
      addr.suburb,
    ].filter(Boolean) as string[];

    for (const raw of candidates) {
      if (isRegionLabel(raw)) continue;
      return {
        name: toPolishPlaceName(raw),
        lat: Number(data.lat ?? point.lat),
        lon: Number(data.lon ?? point.lon),
        country_code: addr.country_code?.toUpperCase(),
      };
    }
  } catch {
    return null;
  }
  return null;
}

export async function resolveClusterSettlement(
  cluster: GeoCluster,
): Promise<ClusterSettlement | null> {
  const centroid = cluster.center;
  const sorted = [...cluster.attractions].sort(
    (a, b) =>
      distanceKm(centroid, { lat: Number(a.lat), lon: Number(a.lon) }) -
      distanceKm(centroid, { lat: Number(b.lat), lon: Number(b.lon) }),
  );

  const votes: SettlementVote[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const vote = voteFromAttraction(sorted[i], i === 0 ? 2 : 1);
    if (vote) votes.push(vote);
  }

  const fromTags = pickSettlementFromVotes(votes);
  if (fromTags) return fromTags;

  for (const attraction of sorted.slice(0, 3)) {
    const point = { lat: Number(attraction.lat), lon: Number(attraction.lon) };
    const reversed = await reverseGeocodeSettlement(point);
    if (reversed) return reversed;
    await new Promise((r) => setTimeout(r, 1100));
  }

  const reversedCentroid = await reverseGeocodeSettlement(centroid);
  return reversedCentroid;
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
  return (
    cluster.settlement?.name ??
    cluster.center.lat.toFixed(2) + ", " + cluster.center.lon.toFixed(2)
  );
}

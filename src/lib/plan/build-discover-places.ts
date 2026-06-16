import { distanceKm } from "@/lib/search/geo-clustering";
import {
  filterAttractionsToTouristRegions,
  pointInTouristRegion,
} from "@/lib/plan/tourist-region-anchor";
import {
  resolveDestinationStory,
  matchingRegionsForDestination,
  type DestinationStory,
} from "@/lib/plan/destination-story";
import { selectDiverseAttractionIds, suggestedCountForTrip } from "@/lib/plan/diverse-selection";
import { toPolishAttractionName } from "@/lib/plan/attraction-display-name";
import type { PlanRegionContext } from "@/lib/search/destination-build-payload";
import type { ExplorationScope } from "@/lib/search/exploration-scope";
import {
  pickDisplayName,
  pickWhy,
  regionDisplayName,
  regionMapRadiusKm,
  type TouristRegion,
} from "@/lib/destinations/tourist-regions";
import type { TripDayTheme } from "@/lib/search/trip-rhythm";
import type { AttractionWithActivities, GeoPoint } from "@/types/domain";
import type { Locale } from "@/i18n/config";

export type PlaceCard = {
  id: string;
  name: string;
  why: string;
  theme: TripDayTheme;
  regionName: string;
  regionId: string;
  recommended: boolean;
  rank: number;
  lat: number;
  lon: number;
  durationHint?: string | null;
  source: "pick" | "pool" | "curated";
};

export type DiscoverPlacesResult = {
  story: DestinationStory;
  placeCards: PlaceCard[];
  suggestedIds: string[];
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function isDisplayableAttractionName(name: string): boolean {
  const t = name.trim();
  if (!t) return false;
  if (/^Attraction\s*\(\d+\)/i.test(t)) return false;
  if (/^Unnamed/i.test(t)) return false;
  if (/^Point\s*\(/i.test(t)) return false;
  return true;
}

function point(a: AttractionWithActivities): GeoPoint {
  return { lat: Number(a.lat), lon: Number(a.lon) };
}

function findPoolMatchForPick(
  pickName: string,
  pickPoint: GeoPoint,
  pool: AttractionWithActivities[],
): AttractionWithActivities | null {
  const normalized = normalizeName(pickName);
  let best: AttractionWithActivities | null = null;
  let bestScore = 0;

  for (const a of pool) {
    if (!isDisplayableAttractionName(a.name)) continue;
    const km = distanceKm(pickPoint, point(a));
    const nameNorm = normalizeName(a.name);
    let score = 0;
    if (nameNorm.includes(normalized) || normalized.includes(nameNorm)) score += 10;
    if (km <= 8) score += 5;
    if (km <= 3) score += 5;
    if (a.source === "curated") score += 3;
    if (a.description?.trim()) score += 2;
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return bestScore >= 8 ? best : null;
}

function cardFromPick(
  region: TouristRegion,
  pick: TouristRegion["picks"][number],
  pool: AttractionWithActivities[],
  locale: Locale,
  recommended: boolean,
): PlaceCard | null {
  const name = pickDisplayName(pick, locale);
  const why = pickWhy(pick, locale);
  const pickPoint: GeoPoint = {
    lat: region.center_lat,
    lon: region.center_lon,
  };
  const match = findPoolMatchForPick(name, pickPoint, pool);

  return {
    id: match?.id ?? `pick:${region.id}:${pick.rank}:${normalizeName(pick.name_pl)}`,
    name: match
      ? toPolishAttractionName(match.name, locale)
      : toPolishAttractionName(name, locale),
    why: match?.description?.trim() || why,
    theme: pick.day_theme,
    regionName: regionDisplayName(region, locale),
    regionId: region.id,
    recommended,
    rank: pick.rank,
    lat: match ? Number(match.lat) : region.center_lat,
    lon: match ? Number(match.lon) : region.center_lon,
    durationHint: match?.duration_minutes
      ? `~${Math.round(match.duration_minutes / 60)}h`
      : null,
    source: match?.source === "curated" ? "curated" : "pick",
  };
}

function cardFromPool(
  a: AttractionWithActivities,
  locale: Locale,
  regionName: string,
  regionId: string,
): PlaceCard | null {
  if (!isDisplayableAttractionName(a.name)) return null;
  const why = a.description?.trim();
  if (!why || why.length < 20) return null;

  const slug = a.activity_tags[0]?.activity_slug ?? a.category;
  const theme: TripDayTheme =
    slug.includes("beach") ? "beach_relax"
    : slug.includes("museum") || slug.includes("old_town") || slug.includes("archaeology")
      ? "city_culture"
    : slug.includes("park") || slug.includes("viewpoint") ? "nature"
    : slug.includes("water_park") || slug.includes("zoo") ? "kids"
    : "active_outdoor";

  return {
    id: a.id,
    name: toPolishAttractionName(a.name, locale),
    why,
    theme,
    regionName,
    regionId,
    recommended: false,
    rank: 99,
    lat: Number(a.lat),
    lon: Number(a.lon),
    durationHint: a.duration_minutes
      ? `~${Math.round(a.duration_minutes / 60)}h`
      : null,
    source: a.source === "curated" ? "curated" : "pool",
  };
}

export function buildDiscoverPlaces({
  pool,
  catalog,
  destinationLabel,
  touristRegionId,
  touristRegionIds,
  regionContext,
  preferredActivities = [],
  locale = "pl",
  tripDays = 5,
  explorationScope = "region",
  referencePoint,
  withKids = false,
  stayRadiusKm: stayRadiusKmParam,
}: {
  pool: AttractionWithActivities[];
  catalog: TouristRegion[];
  destinationLabel: string;
  touristRegionId?: string | null;
  touristRegionIds?: string[] | null;
  regionContext?: PlanRegionContext | null;
  preferredActivities?: string[];
  locale?: Locale;
  tripDays?: number;
  explorationScope?: ExplorationScope;
  referencePoint: GeoPoint;
  withKids?: boolean;
  /** Promień rejonu z wyszukiwania — ogranicza karty i sugestie do okolicy bazy. */
  stayRadiusKm?: number;
}): DiscoverPlacesResult {
  const regions = matchingRegionsForDestination(
    catalog,
    destinationLabel,
    touristRegionId,
    touristRegionIds,
  );
  const story = resolveDestinationStory({
    destinationLabel,
    regions,
    regionContext,
    locale,
  });

  const cards: PlaceCard[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  const primaryRegion = regions[0];

  const maxCardKm =
    stayRadiusKmParam ??
    (regions.length > 0
      ? Math.max(...regions.map((r) => regionMapRadiusKm(r)))
      : undefined);

  const poolInRange =
    regions.length > 0
      ? filterAttractionsToTouristRegions(pool, regions, 4)
      : maxCardKm != null
        ? pool.filter(
            (a) => distanceKm(referencePoint, point(a)) <= maxCardKm,
          )
        : pool;

  for (const region of regions) {
    const sortedPicks = [...region.picks].sort((a, b) => a.rank - b.rank);
    const isPrimary = region.id === primaryRegion?.id;

    for (const pick of sortedPicks) {
      const key = normalizeName(pick.name_pl);
      if (seenNames.has(key)) continue;

      const activityMatch = pick.activity_slugs.some((s) =>
        preferredActivities.includes(s),
      );
      const recommended = isPrimary && (pick.rank === 1 || activityMatch);

      const card = cardFromPick(region, pick, poolInRange, locale, recommended);
      if (!card) continue;

      seenNames.add(key);
      if (!seenIds.has(card.id)) {
        seenIds.add(card.id);
        cards.push(card);
      }
    }
  }

  const maxExtra = 8;
  let extras = 0;
  for (const a of poolInRange) {
    if (extras >= maxExtra) break;
    if (seenIds.has(a.id)) continue;

    const card = cardFromPool(
      a,
      locale,
      primaryRegion ? regionDisplayName(primaryRegion, locale) : story.placeName,
      primaryRegion?.id ?? "pool",
    );
    if (!card) continue;
    seenIds.add(card.id);
    cards.push(card);
    extras += 1;
  }

  cards.sort((a, b) => {
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
    return a.rank - b.rank;
  });

  const poolForSuggestions = cards
    .map((c) => poolInRange.find((p) => p.id === c.id))
    .filter((p): p is AttractionWithActivities => p != null);

  const suggestedIds =
    poolForSuggestions.length > 0
      ? selectDiverseAttractionIds(poolForSuggestions, referencePoint, {
          explorationScope,
          tripDays,
          preferredActivities,
          withKids,
          maxCount: Math.min(
            suggestedCountForTrip(tripDays, explorationScope),
            cards.filter((c) => c.recommended).length + 5,
          ),
        })
      : cards.filter((c) => c.recommended).slice(0, 6).map((c) => c.id);

  return { story, placeCards: cards, suggestedIds };
}

export function resolvePlaceSelectionToPoolIds(
  selectedIds: string[],
  pool: AttractionWithActivities[],
  cards: PlaceCard[],
  regions: TouristRegion[] = [],
): string[] {
  const poolIds = new Set(pool.map((p) => p.id));
  const out = new Set<string>();

  function findMatchForCard(card: PlaceCard): AttractionWithActivities | null {
    const cardPoint = { lat: card.lat, lon: card.lon };
    const region = regions.find((r) => r.id === card.regionId);
    const searchPool =
      region != null
        ? pool.filter((p) =>
            pointInTouristRegion(
              { lat: Number(p.lat), lon: Number(p.lon) },
              region,
              6,
            ),
          )
        : pool;

    const normalized = normalizeName(card.name);
    let best: AttractionWithActivities | null = null;
    let bestScore = 0;

    for (const p of searchPool) {
      if (!isDisplayableAttractionName(p.name)) continue;
      const nameNorm = normalizeName(p.name);
      let score = 0;
      if (nameNorm.includes(normalized) || normalized.includes(nameNorm)) {
        score += 12;
      }
      const km = distanceKm(cardPoint, point(p));
      if (km <= 25) score += 4;
      if (km <= 8) score += 4;
      if (p.source === "curated") score += 2;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }

    return bestScore >= 8 ? best : null;
  }

  for (const id of selectedIds) {
    if (poolIds.has(id)) {
      out.add(id);
      continue;
    }
    const card = cards.find((c) => c.id === id);
    if (!card) continue;

    const match = findMatchForCard(card);
    if (match) {
      out.add(match.id);
      continue;
    }

    if (id.startsWith("pick:")) {
      const byRegion = pool.find(
        (p) =>
          p.source === "curated" &&
          p.tags &&
          typeof p.tags === "object" &&
          "curated_region" in p.tags &&
          normalizeName(p.name).includes(normalizeName(card.name).slice(0, 6)),
      );
      if (byRegion) out.add(byRegion.id);
    }
  }

  return [...out];
}

export type { DestinationStory };

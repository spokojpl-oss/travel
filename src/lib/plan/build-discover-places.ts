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
import { curatedPickId } from "@/lib/plan/curated-day-trips";
import {
  CYCLING_REST_ACTIVITY_SLUGS,
  isCyclingRestPick,
} from "@/lib/plan/cycling-plan";

export type PlaceCard = {
  id: string;
  name: string;
  why: string;
  /** Dłuższy opis z bazy atrakcji (jeśli różni się od why). */
  detail?: string | null;
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
  pickIndex: number,
  pool: AttractionWithActivities[],
  locale: Locale,
  recommended: boolean,
): PlaceCard | null {
  const name = pickDisplayName(pick, locale);
  const curatedWhy = pickWhy(pick, locale);
  const pickPoint: GeoPoint = {
    lat: region.center_lat,
    lon: region.center_lon,
  };
  const match = findPoolMatchForPick(name, pickPoint, pool);
  const fallbackId = curatedPickId(region.id, pickIndex);
  const poolDetail = match?.description?.trim();
  const detail =
    poolDetail && poolDetail !== curatedWhy && poolDetail.length > curatedWhy.length
      ? poolDetail
      : null;

  return {
    id: match?.id ?? fallbackId,
    name: match
      ? toPolishAttractionName(match.name, locale)
      : toPolishAttractionName(name, locale),
    why: curatedWhy,
    detail,
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
  cyclingRestMode = false,
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
  /** Kolarstwo: tylko plaże, punkty widokowe i słynne wjazdy (bez generycznych pętli). */
  cyclingRestMode?: boolean;
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
      if (cyclingRestMode && !isCyclingRestPick(pick)) continue;

      const key = normalizeName(pick.name_pl);
      if (seenNames.has(key)) continue;

      const activityMatch = pick.activity_slugs.some((s) =>
        preferredActivities.includes(s),
      );
      const recommended = isPrimary && (pick.rank === 1 || activityMatch);

      const card = cardFromPick(
        region,
        pick,
        region.picks.indexOf(pick),
        poolInRange,
        locale,
        recommended,
      );
      if (!card) continue;

      if (cyclingRestMode && card.source === "pick" && card.id.startsWith("curated:") && card.theme !== "beach_relax") {
        continue;
      }

      seenNames.add(key);
      if (!seenIds.has(card.id)) {
        seenIds.add(card.id);
        cards.push(card);
      }
    }
  }

  const maxExtra = 16;
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
    if (cyclingRestMode) {
      const slugs = a.activity_tags?.map((t) => t.activity_slug) ?? [];
      const restOk =
        card.theme === "beach_relax" ||
        slugs.some((s) =>
          (CYCLING_REST_ACTIVITY_SLUGS as readonly string[]).includes(s),
        ) ||
        slugs.includes("viewpoints");
      if (!restOk) continue;
    }
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

function curatedPickIdForCard(
  card: PlaceCard,
  regions: TouristRegion[],
): string | null {
  const region = regions.find((r) => r.id === card.regionId);
  if (!region) return null;
  const pickIndex = region.picks.findIndex((p) => p.rank === card.rank);
  if (pickIndex < 0) return null;
  return curatedPickId(region.id, pickIndex);
}

export function placeCardToAttractionStub(
  card: PlaceCard,
): AttractionWithActivities {
  const now = new Date().toISOString();
  return {
    id: card.id,
    name: card.name,
    description: [card.why, card.detail].filter(Boolean).join("\n\n"),
    category: card.theme,
    subcategories: [],
    lat: card.lat,
    lon: card.lon,
    address: null,
    phone: null,
    website: null,
    opening_hours: null,
    tags: card.source === "pick" ? { place_card: true } : null,
    min_age: null,
    duration_minutes: null,
    destination_id: null,
    source: card.source === "pool" ? "osm" : "curated",
    external_id: card.regionId,
    created_at: now,
    updated_at: now,
    activity_tags: [],
  };
}

export function selectedPlaceMapPoints(
  selectedIds: Set<string>,
  cards: PlaceCard[],
): Array<{ id: string; name: string; lat: number; lon: number }> {
  return cards
    .filter((c) => selectedIds.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      lat: c.lat,
      lon: c.lon,
    }));
}

function findMatchForCard(
  card: PlaceCard,
  pool: AttractionWithActivities[],
  regions: TouristRegion[],
): AttractionWithActivities | null {
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

export function resolveSelectedCardsToAttractions(
  selectedIds: Iterable<string>,
  pool: AttractionWithActivities[],
  cards: PlaceCard[],
  regions: TouristRegion[] = [],
): AttractionWithActivities[] {
  const poolById = new Map(pool.map((p) => [p.id, p]));
  const out: AttractionWithActivities[] = [];

  for (const id of selectedIds) {
    const card = cards.find((c) => c.id === id);
    if (!card) {
      const direct = poolById.get(id);
      if (direct) out.push(direct);
      continue;
    }

    if (poolById.has(card.id)) {
      out.push(poolById.get(card.id)!);
      continue;
    }

    const curatedId = curatedPickIdForCard(card, regions);
    if (curatedId && poolById.has(curatedId)) {
      out.push(poolById.get(curatedId)!);
      continue;
    }

    const match = findMatchForCard(card, pool, regions);
    if (match) {
      out.push(match);
      continue;
    }

    out.push(placeCardToAttractionStub(card));
  }

  return out;
}

export function resolvePlaceSelectionToPoolIds(
  selectedIds: string[],
  pool: AttractionWithActivities[],
  cards: PlaceCard[],
  regions: TouristRegion[] = [],
): string[] {
  return resolveSelectedCardsToAttractions(
    selectedIds,
    pool,
    cards,
    regions,
  ).map((a) => a.id);
}

export type { DestinationStory };

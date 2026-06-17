import type { Locale } from "@/i18n/config";
import type { TripDayTheme, TripRhythm } from "@/lib/search/trip-rhythm";
import { activeThemes } from "@/lib/search/trip-rhythm";
import { isCompactIslandDestination } from "@/lib/search/destination-size";
import { distanceKm } from "@/lib/search/geo-clustering";
import {
  pointInIslandBbox,
  resolveIslandBoundaryForSearch,
} from "@/lib/destinations/island-boundary";
import { DESTINATION_LABEL_ALIASES } from "@/lib/destinations/destination-label-aliases";
import { SEED_TOURIST_REGIONS } from "@/lib/destinations/tourist-regions-seed";

export type RegionCharacter = "resort" | "historic" | "wild" | "mixed";
export type RegionVibe = "popular" | "balanced" | "offbeat";

export type RegionPick = {
  day_theme: TripDayTheme;
  name_pl: string;
  name_en: string;
  why_pl: string;
  why_en: string;
  activity_slugs: string[];
  rank: number;
};

export type TouristRegion = {
  id: string;
  /** Klucze dopasowania do destination_label (np. saranda, albania, lanzarote) */
  destination_keys: string[];
  slug: string;
  name_pl: string;
  name_en: string;
  character: RegionCharacter;
  vibe: RegionVibe;
  /** Krótka wskazówka geograficzna na mapie (np. „Wschód wyspy · lotnisko LCA”). */
  area_label_pl?: string;
  area_label_en?: string;
  overview_pl: string;
  overview_en: string;
  stay_hint_pl: string;
  stay_hint_en: string;
  center_lat: number;
  center_lon: number;
  /** Promień rejonu na mapie wyboru bazy (km). */
  radius_km?: number;
  picks: RegionPick[];
};

export type ScoredTouristRegion = TouristRegion & {
  score: number;
  matched_themes: TripDayTheme[];
  picks_for_rhythm: RegionPick[];
  activity_slugs: string[];
};

export type DbTouristRegionRow = {
  id: string;
  slug: string;
  destination_keys: string[];
  name_pl: string;
  name_en: string;
  character: RegionCharacter;
  vibe: RegionVibe;
  overview_pl: string;
  overview_en: string;
  stay_hint_pl: string;
  stay_hint_en: string;
  center_lat: number;
  center_lon: number;
  radius_km?: number | null;
  active?: boolean;
  sort_order?: number;
  region_picks?: DbRegionPickRow[];
};

export type DbRegionPickRow = {
  id?: string;
  region_id?: string;
  day_theme: TripDayTheme;
  name_pl: string;
  name_en: string;
  why_pl: string;
  why_en: string;
  activity_slugs: string[];
  rank: number;
};

function transliterateGreek(text: string): string {
  const map: Record<string, string> = {
    α: "a",
    ά: "a",
    β: "v",
    γ: "g",
    δ: "d",
    ε: "e",
    έ: "e",
    ζ: "z",
    η: "i",
    ή: "i",
    θ: "th",
    ι: "i",
    ί: "i",
    ϊ: "i",
    ΐ: "i",
    κ: "k",
    λ: "l",
    μ: "m",
    ν: "n",
    ξ: "x",
    ο: "o",
    ό: "o",
    π: "p",
    ρ: "r",
    σ: "s",
    ς: "s",
    τ: "t",
    υ: "y",
    ύ: "y",
    ϋ: "y",
    ΰ: "y",
    φ: "f",
    χ: "ch",
    ψ: "ps",
    ω: "o",
    ώ: "o",
  };
  return [...text].map((char) => map[char] ?? char).join("");
}

const CYCLING_GEO_RADIUS_KM = 110;
const FAMILY_GEO_RADIUS_KM = 90;

export function isCyclingTouristRegion(region: TouristRegion): boolean {
  return (
    region.slug.includes("cycling") ||
    region.id.startsWith("cy-") ||
    region.id.includes("-cycling") ||
    region.id.startsWith("gr-crete-")
  );
}

function destinationMatchKeys(label: string): string[] {
  const norm = normalizeDestinationKey(label);
  const parts = norm.split(/\s+/).filter(Boolean);
  const keys = new Set<string>([norm, ...parts]);
  const head = parts[0];
  if (head) {
    for (const alias of DESTINATION_LABEL_ALIASES[head] ?? []) {
      keys.add(alias);
    }
  }
  return [...keys];
}

function normalizeDestinationKey(label: string): string {
  return transliterateGreek(label.toLowerCase())
    .replace(/ł/g, "l")
    .replace(/ø/g, "o")
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[,]/g, " ")
    .trim();
}

export function mapDbRowToTouristRegion(row: DbTouristRegionRow): TouristRegion {
  const picks = (row.region_picks ?? [])
    .slice()
    .sort((a, b) => a.rank - b.rank || a.name_pl.localeCompare(b.name_pl))
    .map((pick) => ({
      day_theme: pick.day_theme,
      name_pl: pick.name_pl,
      name_en: pick.name_en,
      why_pl: pick.why_pl,
      why_en: pick.why_en,
      activity_slugs: pick.activity_slugs ?? [],
      rank: pick.rank,
    }));

  return {
    id: row.id,
    slug: row.slug,
    destination_keys: row.destination_keys ?? [],
    name_pl: row.name_pl,
    name_en: row.name_en,
    character: row.character,
    vibe: row.vibe,
    overview_pl: row.overview_pl,
    overview_en: row.overview_en,
    stay_hint_pl: row.stay_hint_pl,
    stay_hint_en: row.stay_hint_en,
    center_lat: Number(row.center_lat),
    center_lon: Number(row.center_lon),
    radius_km:
      row.radius_km != null ? Number(row.radius_km) : undefined,
    picks,
  };
}

export function regionAreaLabel(
  region: TouristRegion,
  locale: Locale = "pl",
): string | null {
  const label = locale === "en" ? region.area_label_en : region.area_label_pl;
  return label?.trim() || null;
}

export function regionMapRadiusKm(
  region: TouristRegion,
  destinationLabel?: string | null,
): number {
  let km: number;
  if (region.radius_km != null && region.radius_km > 0) {
    km = region.radius_km;
  } else {
    switch (region.character) {
      case "resort":
        km = 16;
        break;
      case "historic":
        km = 14;
        break;
      case "wild":
        km = 28;
        break;
      default:
        km = 20;
    }
  }

  if (destinationLabel && isCompactIslandDestination(destinationLabel)) {
    return Math.min(km, 6);
  }
  return km;
}

const GENERAL_REGION_IDS = new Set([
  "cy-cyprus-general",
]);

function isGeneralFallbackRegion(region: TouristRegion): boolean {
  return (
    GENERAL_REGION_IDS.has(region.id) ||
    region.slug.endsWith("-general") ||
    region.id.endsWith("-general")
  );
}

export function destinationKeysFromLabel(
  label: string,
  catalog: TouristRegion[] = SEED_TOURIST_REGIONS,
): string[] {
  const norm = normalizeDestinationKey(label);
  const parts = norm.split(/\s+/).filter(Boolean);
  const keys = new Set<string>([norm, ...parts]);
  for (const entry of catalog) {
    for (const key of entry.destination_keys) {
      if (norm.includes(key) || key.includes(norm)) keys.add(key);
    }
  }
  return [...keys];
}

/** Klucze zbyt ogólne — same nie wiążą regionu z destynacją. */
const GENERIC_DESTINATION_KEYS = new Set([
  "grecja",
  "greece",
  "albania",
  "hiszpania",
  "spain",
  "chorwacja",
  "croatia",
  "hrvatska",
  "wlochy",
  "italy",
  "italia",
  "francja",
  "france",
  "portugalia",
  "portugal",
  "turcja",
  "turkey",
  "ionian",
  "wyspy jonskie",
  "baleares",
  "kyklady",
  "cyclades",
  "cypr",
  "cyprus",
  "czechy",
  "czech",
  "czechia",
  "cesko",
]);

function matchesLabelKeyToRegionKey(labelKey: string, regionKey: string): boolean {
  if (labelKey === regionKey) return true;

  const minLen = 6;
  if (labelKey.length >= minLen && regionKey.length >= minLen) {
    if (labelKey.includes(regionKey) || regionKey.includes(labelKey)) {
      return true;
    }
  }

  if (!labelKey.includes(" ") && labelKey.length >= minLen) {
    if (regionKey.includes(labelKey)) return true;
    if (labelKey.includes(regionKey) && regionKey.length >= 5) return true;
  }

  return false;
}

/** Destynacja to kraj (np. „Albania” lub „Albania, Albania”), nie konkretne miasto/wyspa. */
function isCountryLevelDestinationLabel(label: string): boolean {
  const norm = normalizeDestinationKey(label);
  const parts = norm.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return false;
  return parts.every((part) => GENERIC_DESTINATION_KEYS.has(part));
}

export function regionMatchesDestination(region: TouristRegion, label: string): boolean {
  const labelKeys = destinationMatchKeys(label);

  const genericKeys = region.destination_keys.filter((key) =>
    GENERIC_DESTINATION_KEYS.has(key),
  );
  const specificKeys = region.destination_keys.filter(
    (key) => !GENERIC_DESTINATION_KEYS.has(key),
  );

  if (
    specificKeys.some((key) =>
      labelKeys.some((labelKey) => matchesLabelKeyToRegionKey(labelKey, key)),
    )
  ) {
    return true;
  }

  if (isCountryLevelDestinationLabel(label)) {
    return genericKeys.some((key) =>
      labelKeys.some((labelKey) => matchesLabelKeyToRegionKey(labelKey, key)),
    );
  }

  return false;
}

function scoreRegionForRhythm(
  region: TouristRegion,
  rhythm: TripRhythm,
): ScoredTouristRegion {
  const themes = activeThemes(rhythm).filter((t) => t !== "free" && rhythm.days[t] > 0);
  const picks_for_rhythm: RegionPick[] = [];
  let score = 0;
  const matched_themes: TripDayTheme[] = [];

  for (const theme of themes) {
    const themePicks = region.picks
      .filter((p) => p.day_theme === theme)
      .sort((a, b) => a.rank - b.rank);
    if (themePicks.length === 0) continue;

    matched_themes.push(theme);
    score += rhythm.days[theme] * 10 + themePicks.length * 3;
    picks_for_rhythm.push(...themePicks.slice(0, Math.min(2, rhythm.days[theme])));
  }

  const activity_slugs = [
    ...new Set(picks_for_rhythm.flatMap((p) => p.activity_slugs)),
  ];

  if (region.character === "resort" && rhythm.days.beach_relax >= 2) score += 5;
  if (region.character === "historic" && rhythm.days.city_culture >= 2) score += 5;
  if (region.character === "wild" && rhythm.days.beach_relax >= 1) score += 3;

  return {
    ...region,
    score,
    matched_themes,
    picks_for_rhythm,
    activity_slugs,
  };
}

function isCyclingRhythm(rhythm: TripRhythm): boolean {
  return (
    rhythm.preset === "cycling_only" || rhythm.preset === "cycling_beach_mix"
  );
}

export function findTouristRegionsInCatalog(
  catalog: TouristRegion[],
  {
    destinationLabel,
    rhythm,
    limit = 8,
    coords,
  }: {
    destinationLabel: string;
    rhythm: TripRhythm;
    limit?: number;
    coords?: { lat: number; lon: number } | null;
  },
): ScoredTouristRegion[] {
  const cycling = isCyclingRhythm(rhythm);
  const labelMatched = catalog.filter((r) =>
    regionMatchesDestination(r, destinationLabel),
  );
  const matchedIds = new Set(labelMatched.map((r) => r.id));

  let pool = labelMatched;

  const islandBoundary = resolveIslandBoundaryForSearch(
    destinationLabel,
    coords ?? null,
  );
  const compactIsland = isCompactIslandDestination(destinationLabel);

  if (coords && (cycling || pool.length < 4) && !compactIsland) {
    const radiusKm = cycling ? CYCLING_GEO_RADIUS_KM : FAMILY_GEO_RADIUS_KM;
    const geoMatched = catalog.filter((r) => {
      if (matchedIds.has(r.id)) return false;
      if (cycling && !isCyclingTouristRegion(r)) return false;
      return (
        distanceKm(coords, { lat: r.center_lat, lon: r.center_lon }) <= radiusKm
      );
    });
    pool = [...pool, ...geoMatched];
  }

  if (compactIsland && islandBoundary) {
    pool = pool.filter((r) =>
      pointInIslandBbox(
        { lat: r.center_lat, lon: r.center_lon },
        islandBoundary.bbox,
        0.02,
      ),
    );
  }

  let scored = pool
    .map((r) => scoreRegionForRhythm(r, rhythm))
    .filter((r) => cycling || r.score > 0)
    .map((r) => {
      if (!cycling) return r;
      let bonus = 0;
      if (isCyclingTouristRegion(r)) bonus += 50;
      if (r.character === "resort" && !isCyclingTouristRegion(r)) bonus -= 35;
      if (r.character === "wild" && isCyclingTouristRegion(r)) bonus += 8;
      return bonus === 0 ? r : { ...r, score: r.score + bonus };
    })
    .sort((a, b) => b.score - a.score);

  if (
    cycling &&
    rhythm.preset === "cycling_only" &&
    !isCountryLevelDestinationLabel(destinationLabel)
  ) {
    const cyclingRegions = scored.filter((r) => isCyclingTouristRegion(r));
    if (cyclingRegions.length >= 2) {
      scored = cyclingRegions;
    }
  }

  const specific = scored.filter((r) => !isGeneralFallbackRegion(r));
  const general = scored.filter((r) => isGeneralFallbackRegion(r));

  const ordered =
    specific.length >= 3
      ? [...specific, ...general.slice(0, 1)]
      : [...specific, ...general];

  return ordered.slice(0, limit);
}

/** Synchroniczny fallback na seed — używaj `findTouristRegionsAsync` w API. */
export function findTouristRegions({
  destinationLabel,
  rhythm,
  limit = 8,
}: {
  destinationLabel: string;
  rhythm: TripRhythm;
  limit?: number;
}): ScoredTouristRegion[] {
  return findTouristRegionsInCatalog(SEED_TOURIST_REGIONS, {
    destinationLabel,
    rhythm,
    limit,
  });
}

export function getTouristRegionById(
  id: string,
  catalog: TouristRegion[] = SEED_TOURIST_REGIONS,
): TouristRegion | null {
  return catalog.find((r) => r.id === id) ?? null;
}

const CHARACTER_LABELS: Record<RegionCharacter, { pl: string; en: string }> = {
  resort: { pl: "Kurort", en: "Resort" },
  historic: { pl: "Historyczny", en: "Historic" },
  wild: { pl: "Dziko", en: "Off the beaten path" },
  mixed: { pl: "Mix", en: "Mixed" },
};

const VIBE_LABELS: Record<RegionVibe, { pl: string; en: string }> = {
  popular: { pl: "Popularny", en: "Popular" },
  balanced: { pl: "Zbalansowany", en: "Balanced" },
  offbeat: { pl: "Mniej znany", en: "Offbeat" },
};

export function regionCharacterLabel(
  character: RegionCharacter,
  locale: Locale,
): string {
  return CHARACTER_LABELS[character][locale];
}

export function regionVibeLabel(vibe: RegionVibe, locale: Locale): string {
  return VIBE_LABELS[vibe][locale];
}

export function regionDisplayName(region: TouristRegion, locale: Locale): string {
  return locale === "en" ? region.name_en : region.name_pl;
}

export function pickDisplayName(pick: RegionPick, locale: Locale): string {
  return locale === "en" ? pick.name_en : pick.name_pl;
}

export function pickWhy(pick: RegionPick, locale: Locale): string {
  return locale === "en" ? pick.why_en : pick.why_pl;
}

export { SEED_TOURIST_REGIONS };

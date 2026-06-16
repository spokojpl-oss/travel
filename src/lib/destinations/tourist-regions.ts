import type { Locale } from "@/i18n/config";
import type { TripDayTheme, TripRhythm } from "@/lib/search/trip-rhythm";
import { activeThemes } from "@/lib/search/trip-rhythm";
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
  overview_pl: string;
  overview_en: string;
  stay_hint_pl: string;
  stay_hint_en: string;
  center_lat: number;
  center_lon: number;
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

function normalizeDestinationKey(label: string): string {
  return transliterateGreek(label.toLowerCase())
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
    picks,
  };
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
  "ionian",
  "wyspy jonskie",
  "baleares",
  "kyklady",
  "cyclades",
]);

function regionMatchesDestination(region: TouristRegion, label: string): boolean {
  const norm = normalizeDestinationKey(label);
  const head = norm.split(/\s+/)[0]?.trim() ?? norm;

  const specificKeys = region.destination_keys.filter(
    (key) => !GENERIC_DESTINATION_KEYS.has(key),
  );
  const keysToMatch = specificKeys.length > 0 ? specificKeys : region.destination_keys;

  return keysToMatch.some(
    (key) => norm.includes(key) || key.includes(head),
  );
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

export function findTouristRegionsInCatalog(
  catalog: TouristRegion[],
  {
    destinationLabel,
    rhythm,
    limit = 6,
  }: {
    destinationLabel: string;
    rhythm: TripRhythm;
    limit?: number;
  },
): ScoredTouristRegion[] {
  return catalog
    .filter((r) => regionMatchesDestination(r, destinationLabel))
    .map((r) => scoreRegionForRhythm(r, rhythm))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Synchroniczny fallback na seed — używaj `findTouristRegionsAsync` w API. */
export function findTouristRegions({
  destinationLabel,
  rhythm,
  limit = 6,
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

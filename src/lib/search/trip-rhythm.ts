import type { Locale } from "@/i18n/config";
import type { WeatherSummary } from "@/types/domain";
import { daysBetweenIso } from "@/lib/search/trip-context";
import {
  destinationHasSeaAccess,
  destinationSupportsBeachRelax,
  resolveWaterRecreationKind,
} from "@/lib/destinations/coastal-access";

export type TripDayTheme =
  | "beach_relax"
  | "city_culture"
  | "active_outdoor"
  | "nature"
  | "kids"
  | "free";

export type TripRhythmPreset =
  | "beach_focus"
  | "balanced"
  | "culture_focus"
  | "active"
  | "cycling_beach_mix"
  | "cycling_only";

export type TripRhythm = {
  days: Record<TripDayTheme, number>;
  preset?: TripRhythmPreset | null;
};

export const TRIP_DAY_THEMES: TripDayTheme[] = [
  "beach_relax",
  "city_culture",
  "active_outdoor",
  "nature",
  "kids",
  "free",
];

const EMPTY_DAYS = (): Record<TripDayTheme, number> => ({
  beach_relax: 0,
  city_culture: 0,
  active_outdoor: 0,
  nature: 0,
  kids: 0,
  free: 0,
});

const PRESET_RATIOS: Record<
  TripRhythmPreset,
  Partial<Record<TripDayTheme, number>>
> = {
  beach_focus: { beach_relax: 5, city_culture: 1, free: 1 },
  balanced: {
    beach_relax: 3,
    city_culture: 2,
    active_outdoor: 1,
    free: 1,
  },
  culture_focus: { beach_relax: 1, city_culture: 4, nature: 1, free: 1 },
  active: {
    beach_relax: 2,
    active_outdoor: 2,
    nature: 2,
    city_culture: 1,
  },
  cycling_beach_mix: {
    beach_relax: 3,
    active_outdoor: 3,
    free: 1,
  },
  cycling_only: {
    active_outdoor: 5,
    nature: 1,
    free: 1,
  },
};

export const THEME_ACTIVITY_SLUGS: Record<TripDayTheme, string[]> = {
  beach_relax: ["sandy_beaches", "rocky_beaches", "boat_tour"],
  city_culture: ["old_towns", "museums", "castles", "archaeology"],
  active_outdoor: [
    "kayaking",
    "hiking_trails",
    "quads",
    "bike_rental",
    "mountain_biking",
  ],
  nature: ["viewpoints", "caves", "waterfalls", "national_parks"],
  kids: ["theme_parks", "zoo", "aquarium", "water_parks"],
  free: [],
};

export const THEME_TAXONOMY_GROUPS: Record<TripDayTheme, string[]> = {
  beach_relax: ["beaches", "water_sports"],
  city_culture: ["culture"],
  active_outdoor: ["water_sports", "motorsports", "cycling", "hiking"],
  nature: ["nature", "hiking"],
  kids: ["kids"],
  free: [],
};

export type ThemeMeta = {
  icon: "sparkles" | "map-pin" | "route" | "target" | "users" | "bookmark";
  labelKey: string;
  descKey: string;
};

export const THEME_META: Record<TripDayTheme, ThemeMeta> = {
  beach_relax: {
    icon: "sparkles",
    labelKey: "rhythm.themeBeach",
    descKey: "rhythm.themeBeachDesc",
  },
  city_culture: {
    icon: "map-pin",
    labelKey: "rhythm.themeCity",
    descKey: "rhythm.themeCityDesc",
  },
  active_outdoor: {
    icon: "route",
    labelKey: "rhythm.themeActive",
    descKey: "rhythm.themeActiveDesc",
  },
  nature: {
    icon: "target",
    labelKey: "rhythm.themeNature",
    descKey: "rhythm.themeNatureDesc",
  },
  kids: {
    icon: "users",
    labelKey: "rhythm.themeKids",
    descKey: "rhythm.themeKidsDesc",
  },
  free: {
    icon: "bookmark",
    labelKey: "rhythm.themeFree",
    descKey: "rhythm.themeFreeDesc",
  },
};

export function rhythmTotalDays(rhythm: TripRhythm): number {
  return TRIP_DAY_THEMES.reduce((sum, theme) => sum + rhythm.days[theme], 0);
}

export function activeThemes(rhythm: TripRhythm): TripDayTheme[] {
  return TRIP_DAY_THEMES.filter((theme) => rhythm.days[theme] > 0);
}

function distributeDays(
  weights: Partial<Record<TripDayTheme, number>>,
  totalDays: number,
): Record<TripDayTheme, number> {
  const days = EMPTY_DAYS();
  if (totalDays <= 0) return days;

  const entries = Object.entries(weights).filter(
    ([, w]) => (w ?? 0) > 0,
  ) as Array<[TripDayTheme, number]>;
  if (entries.length === 0) {
    days.free = totalDays;
    return days;
  }

  const weightSum = entries.reduce((s, [, w]) => s + w, 0);
  let assigned = 0;
  const fractions: Array<{ theme: TripDayTheme; frac: number }> = [];

  for (const [theme, weight] of entries) {
    const exact = (weight / weightSum) * totalDays;
    const whole = Math.floor(exact);
    days[theme] = whole;
    assigned += whole;
    fractions.push({ theme, frac: exact - whole });
  }

  let remaining = totalDays - assigned;
  fractions.sort((a, b) => b.frac - a.frac);
  for (const item of fractions) {
    if (remaining <= 0) break;
    days[item.theme] += 1;
    remaining -= 1;
  }

  return days;
}

export function applyRhythmPreset(
  preset: TripRhythmPreset,
  totalDays: number,
  options?: { includeKids?: boolean; destinationLabel?: string },
): TripRhythm {
  const ratios = { ...PRESET_RATIOS[preset] };
  if (options?.includeKids && preset === "balanced" && totalDays >= 5) {
    ratios.kids = 1;
    if (ratios.beach_relax && ratios.beach_relax > 1) {
      ratios.beach_relax -= 1;
    }
  }
  const days = distributeDays(ratios, totalDays);
  return sanitizeRhythmForDestination(
    { preset, days },
    totalDays,
    options?.destinationLabel,
  );
}

function redistributeBeachDays(
  days: Record<TripDayTheme, number>,
): Record<TripDayTheme, number> {
  const beachDays = days.beach_relax;
  if (beachDays <= 0) return days;
  const next = { ...days, beach_relax: 0 };
  next.nature += Math.ceil(beachDays / 2);
  next.active_outdoor += Math.floor(beachDays / 2);
  if (next.nature + next.active_outdoor < beachDays) {
    next.free += beachDays - next.nature - next.active_outdoor;
  }
  return next;
}

export function sanitizeRhythmForDestination(
  rhythm: TripRhythm,
  totalDays: number,
  destinationLabel?: string,
): TripRhythm {
  if (!destinationLabel || destinationSupportsBeachRelax(destinationLabel)) {
    return rhythm;
  }

  let days = redistributeBeachDays(rhythm.days);
  let preset = rhythm.preset;

  if (preset === "beach_focus" || preset === "cycling_beach_mix") {
    preset = preset === "cycling_beach_mix" ? "cycling_only" : "balanced";
    days = distributeDays(PRESET_RATIOS[preset], totalDays);
  }

  return { days, preset };
}

export function defaultRhythmForTrip(
  departureDate: string,
  returnDate: string | null,
  options?: {
    includeKids?: boolean;
    cycling?: boolean;
    destinationLabel?: string;
  },
): TripRhythm {
  const totalDays = daysBetweenIso(
    departureDate,
    returnDate ?? departureDate,
  );
  const label = options?.destinationLabel ?? "";
  const cycling = options?.cycling ?? false;
  const waterKind = resolveWaterRecreationKind(label);

  let preset: TripRhythmPreset;
  if (cycling) {
    preset =
      waterKind === "none" ? "cycling_only" : "cycling_beach_mix";
  } else {
    preset = "balanced";
  }

  return applyRhythmPreset(preset, totalDays, {
    includeKids: options?.includeKids,
    destinationLabel: label,
  });
}

export function normalizeRhythm(
  rhythm: TripRhythm,
  totalDays: number,
): TripRhythm {
  const current = rhythmTotalDays(rhythm);
  if (current === totalDays) return rhythm;
  if (current === 0) {
    return applyRhythmPreset("balanced", totalDays);
  }
  return { ...rhythm, days: distributeDays(rhythm.days, totalDays), preset: null };
}

export function tripRhythmToParams(rhythm: TripRhythm): URLSearchParams {
  const p = new URLSearchParams();
  for (const theme of TRIP_DAY_THEMES) {
    if (rhythm.days[theme] > 0) {
      p.set(`rhythm_${theme}`, String(rhythm.days[theme]));
    }
  }
  if (rhythm.preset) p.set("rhythm_preset", rhythm.preset);
  return p;
}

export function tripRhythmFromParams(params: URLSearchParams): TripRhythm | null {
  const days = EMPTY_DAYS();
  let hasAny = false;
  for (const theme of TRIP_DAY_THEMES) {
    const raw = params.get(`rhythm_${theme}`);
    if (raw) {
      const n = Number.parseInt(raw, 10);
      if (Number.isFinite(n) && n > 0) {
        days[theme] = n;
        hasAny = true;
      }
    }
  }
  if (!hasAny) return null;

  const presetRaw = params.get("rhythm_preset");
  const preset =
    presetRaw === "beach_focus" ||
    presetRaw === "balanced" ||
    presetRaw === "culture_focus" ||
    presetRaw === "active" ||
    presetRaw === "cycling_beach_mix" ||
    presetRaw === "cycling_only"
      ? presetRaw
      : null;

  return { days, preset };
}

function pickSlugForTheme(
  theme: TripDayTheme,
  counts: Record<string, number>,
): string[] {
  const candidates = THEME_ACTIVITY_SLUGS[theme];
  if (candidates.length === 0) return [];

  const available = candidates.filter((slug) => (counts[slug] ?? 0) > 0);
  const pool = available.length > 0 ? available : candidates;
  return pool.slice(0, theme === "beach_relax" ? 1 : 2);
}

export function suggestActivitiesFromRhythm({
  rhythm,
  counts = {},
  weather,
  passengers,
  extraSlugs = [],
}: {
  rhythm: TripRhythm;
  counts?: Record<string, number>;
  weather?: WeatherSummary | null;
  passengers?: string;
  extraSlugs?: string[];
}): string[] {
  const picked = new Set<string>(extraSlugs);
  const themes = activeThemes(rhythm).filter((t) => t !== "free");

  for (const theme of themes) {
    for (const slug of pickSlugForTheme(theme, counts)) {
      picked.add(slug);
    }
  }

  const warm = (weather?.avg_temp_max ?? 20) >= 24;
  const rainy = (weather?.rainy_days ?? 0) >= 2;
  const kids =
    rhythm.days.kids > 0 ||
    (passengers ? /dzieci|child|kid/i.test(passengers) : false);

  if (rainy && rhythm.days.city_culture > 0) picked.add("museums");
  if (warm && rhythm.days.beach_relax > 0 && !picked.has("sandy_beaches")) {
    picked.add("sandy_beaches");
  }
  if (kids && rhythm.days.kids > 0) {
    for (const slug of pickSlugForTheme("kids", counts)) picked.add(slug);
  }

  return [...picked].slice(0, 6);
}

export function isActivityInRhythm(
  slug: string,
  rhythm: TripRhythm | null,
): boolean {
  if (!rhythm) return true;
  const themes = activeThemes(rhythm).filter((t) => t !== "free");
  if (themes.length === 0) return true;
  return themes.some((theme) => THEME_ACTIVITY_SLUGS[theme].includes(slug));
}

export function isGroupInRhythm(
  groupSlug: string,
  rhythm: TripRhythm | null,
): boolean {
  if (!rhythm) return true;
  const themes = activeThemes(rhythm).filter((t) => t !== "free");
  if (themes.length === 0) return true;
  return themes.some((theme) =>
    THEME_TAXONOMY_GROUPS[theme].includes(groupSlug),
  );
}

const THEME_LABELS: Record<TripDayTheme, { pl: string; en: string }> = {
  beach_relax: { pl: "plażowanie", en: "beach time" },
  city_culture: { pl: "miasta i kultura", en: "cities & culture" },
  active_outdoor: { pl: "aktywnie", en: "active outdoors" },
  nature: { pl: "natura", en: "nature" },
  kids: { pl: "z dziećmi", en: "with kids" },
  free: { pl: "luźne dni", en: "flex days" },
};

export function formatRhythmSummary(
  rhythm: TripRhythm,
  locale: Locale = "pl",
): string {
  const parts = activeThemes(rhythm)
    .filter((t) => rhythm.days[t] > 0)
    .map((theme) => {
      const label = THEME_LABELS[theme][locale];
      const n = rhythm.days[theme];
      if (locale === "en") {
        return n === 1 ? `1 day ${label}` : `${n} days ${label}`;
      }
      if (n === 1) return `1 dzień: ${label}`;
      return `${n} dni: ${label}`;
    });
  return parts.join(" · ");
}

export function hasChildrenInPassengers(passengers?: string): boolean {
  if (!passengers) return false;
  return /dzieci|child|kid/i.test(passengers);
}

export function adjustableThemes(options?: {
  includeKids?: boolean;
  destinationLabel?: string;
}): TripDayTheme[] {
  const supportsBeach =
    !options?.destinationLabel ||
    destinationSupportsBeachRelax(options.destinationLabel);

  const base: TripDayTheme[] = supportsBeach
    ? ["beach_relax", "city_culture", "active_outdoor", "nature", "free"]
    : ["city_culture", "active_outdoor", "nature", "free"];

  if (options?.includeKids) {
    return supportsBeach
      ? [
          "beach_relax",
          "city_culture",
          "active_outdoor",
          "nature",
          "kids",
          "free",
        ]
      : ["city_culture", "active_outdoor", "nature", "kids", "free"];
  }
  return base;
}

export function rhythmPresetsForDestination(options: {
  isCycling: boolean;
  destinationLabel?: string;
}): TripRhythmPreset[] {
  const label = options.destinationLabel ?? "";
  const supportsBeach = destinationSupportsBeachRelax(label);
  const hasSea = destinationHasSeaAccess(label);

  if (options.isCycling) {
    return supportsBeach
      ? ["cycling_beach_mix", "cycling_only"]
      : ["cycling_only"];
  }

  if (!hasSea && !supportsBeach) {
    return ["balanced", "culture_focus", "active"];
  }
  if (!hasSea && supportsBeach) {
    return ["balanced", "culture_focus", "active"];
  }
  return ["beach_focus", "balanced", "culture_focus", "active"];
}

export function beachThemeDescKey(
  destinationLabel?: string,
): "rhythm.themeBeachDesc" | "rhythm.themeBeachDescLake" {
  return resolveWaterRecreationKind(destinationLabel ?? "") === "lake"
    ? "rhythm.themeBeachDescLake"
    : "rhythm.themeBeachDesc";
}

export function cyclingBeachMixDescKey(
  destinationLabel?: string,
): "rhythm.presetCyclingBeachMixDesc" | "rhythm.presetCyclingBeachMixDescLake" {
  return resolveWaterRecreationKind(destinationLabel ?? "") === "lake"
    ? "rhythm.presetCyclingBeachMixDescLake"
    : "rhythm.presetCyclingBeachMixDesc";
}

import type { ActivityDifficulty, ActivityType } from "@/types/activities";

export const CYCLING_ACTIVITY_TYPES: ActivityType[] = [
  "cycling_road",
  "cycling_gravel",
  "cycling_mtb",
  "cycling_ebike",
  "cycling_touring",
];

export const CYCLING_TYPE_LABELS: Record<ActivityType, string> = {
  cycling_road: "Szosa",
  cycling_gravel: "Gravel",
  cycling_mtb: "MTB",
  cycling_ebike: "E-bike",
  cycling_touring: "Bikepacking",
};

export const DIFFICULTY_LABELS: Record<ActivityDifficulty, string> = {
  easy: "Łatwa",
  moderate: "Średnia",
  hard: "Trudna",
  expert: "Ekspert",
};

/** Slugi taksonomii używane w flow kolarstwa (build + wyszukiwanie regionów). */
export const CYCLING_TAXONOMY_SLUGS = [
  "mountain_biking",
  "bike_rental",
  "ebike_rental",
  "cycling",
  "sandy_beaches",
  "rocky_beaches",
  "viewpoints",
] as const;

/** Domyślnie zaznaczone na kroku aktywności — plaże i widoki; reszta w „Inne aktywności”. */
export const CYCLING_DEFAULT_ACTIVITY_SLUGS = [
  "sandy_beaches",
  "rocky_beaches",
  "viewpoints",
] as const;

export function defaultCyclingActivitySlugs(): string[] {
  return [...CYCLING_DEFAULT_ACTIVITY_SLUGS];
}

const CYCLING_PRIMARY_ACTIVITY_SLUGS = new Set<string>(
  CYCLING_DEFAULT_ACTIVITY_SLUGS,
);

/** Grupy widoczne od razu vs zwinięte — plaże i punkty widokowe na wierzchu. */
export function splitTaxonomyForCycling(
  groups: Array<{
    slug: string;
    name_pl: string;
    name_en: string;
    activities: Array<{ slug: string; name_pl: string; name_en: string }>;
  }>,
): {
  primaryGroups: typeof groups;
  optionalGroups: typeof groups;
} {
  const primaryGroups = groups
    .filter((g) => g.slug === "beaches" || g.slug === "nature" || g.slug === "cycling")
    .map((g) => {
      if (g.slug === "cycling") {
        return {
          ...g,
          activities: g.activities.filter((a) =>
            CYCLING_PRIMARY_ACTIVITY_SLUGS.has(a.slug),
          ),
        };
      }
      if (g.slug === "nature") {
        return {
          ...g,
          activities: g.activities.filter((a) => a.slug === "viewpoints"),
        };
      }
      return {
        ...g,
        activities: g.activities.filter((a) =>
          CYCLING_PRIMARY_ACTIVITY_SLUGS.has(a.slug),
        ),
      };
    })
    .filter((g) => g.activities.length > 0);

  const optionalGroups = groups
    .map((g) => {
      if (g.slug === "beaches") {
        return {
          ...g,
          activities: g.activities.filter(
            (a) => !CYCLING_PRIMARY_ACTIVITY_SLUGS.has(a.slug),
          ),
        };
      }
      if (g.slug === "nature") {
        return {
          ...g,
          activities: g.activities.filter((a) => a.slug !== "viewpoints"),
        };
      }
      if (g.slug === "cycling") {
        return {
          ...g,
          activities: g.activities.filter(
            (a) => !CYCLING_PRIMARY_ACTIVITY_SLUGS.has(a.slug),
          ),
        };
      }
      return g;
    })
    .filter((g) => g.activities.length > 0);

  return { primaryGroups, optionalGroups };
}

export const CYCLING_DIFFICULTIES: ActivityDifficulty[] = [
  "easy",
  "moderate",
  "hard",
  "expert",
];

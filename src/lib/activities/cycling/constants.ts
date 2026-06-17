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
] as const;

/** Domyślnie zaznaczone na kroku aktywności — reszta w „Inne aktywności”. */
export const CYCLING_DEFAULT_ACTIVITY_SLUGS = [
  "bike_rental",
  "ebike_rental",
  "sandy_beaches",
  "rocky_beaches",
] as const;

export function defaultCyclingActivitySlugs(): string[] {
  return [...CYCLING_DEFAULT_ACTIVITY_SLUGS];
}

const CYCLING_PRIMARY_ACTIVITY_SLUGS = new Set<string>(
  CYCLING_DEFAULT_ACTIVITY_SLUGS,
);

/** Grupy widoczne od razu vs zwinięte — tylko wypożyczalnie i plaże na wierzchu. */
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
    .filter((g) => g.slug === "beaches" || g.slug === "cycling")
    .map((g) => ({
      ...g,
      activities: g.activities.filter((a) =>
        CYCLING_PRIMARY_ACTIVITY_SLUGS.has(a.slug),
      ),
    }))
    .filter((g) => g.activities.length > 0);

  const optionalGroups = groups
    .filter((g) => g.slug !== "beaches")
    .map((g) => {
      if (g.slug !== "cycling") return g;
      return {
        ...g,
        activities: g.activities.filter(
          (a) => !CYCLING_PRIMARY_ACTIVITY_SLUGS.has(a.slug),
        ),
      };
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

import type { ActivitySearchQuery } from "@/types/domain";

export type ExplorationScope = "local" | "region" | "island" | "roadtrip";

export type ScopeSearchRadii = {
  /** Promień atrakcji „w okolicy bazy” — jeden dzień bez dalekiego dojazdu. */
  stay_radius_km: number;
  /** Szerszy zasięg wyszukiwania / wycieczek dojazdowych. */
  explore_radius_km: number;
};

export const EXPLORATION_SCOPE_OPTIONS: Array<{
  value: ExplorationScope;
  label_pl: string;
  label_en: string;
  description_pl: string;
  description_en: string;
}> = [
  {
    value: "local",
    label_pl: "Jeden rejon",
    label_en: "One area",
    description_pl:
      "Nocleg w jednej miejscowości — atrakcje w promieniu ok. 15 km, bez jeżdżenia po całej wyspie.",
    description_en:
      "Stay in one town — attractions within ~15 km, no driving across the whole island.",
  },
  {
    value: "region",
    label_pl: "Część wyspy / regionu",
    label_en: "Part of the island",
    description_pl:
      "Opis regionów z mapą atrakcji — wybierz rejon, w którym chcesz się zatrzymać.",
    description_en:
      "Region overviews with attraction maps — pick the area where you want to stay.",
  },
  {
    value: "island",
    label_pl: "Cała wyspa / destynacja",
    label_en: "Whole island",
    description_pl:
      "Najpierw mapa całej wyspy ze wszystkimi atrakcjami — potem wybierzesz rejon na nocleg.",
    description_en:
      "First a map of the whole island with all attractions — then pick where to stay.",
  },
  {
    value: "roadtrip",
    label_pl: "Podróżuję po okolicy",
    label_en: "Road trip",
    description_pl:
      "Elastyczny dojazd, zmiana bazy lub dłuższe transfery — szerszy zasięg.",
    description_en:
      "Flexible travel, changing bases or longer transfers — wider range.",
  },
];

export function defaultExplorationScope(): ExplorationScope {
  return "region";
}

export function explorationScopeFromString(
  value: string | null | undefined,
): ExplorationScope | null {
  if (
    value === "local" ||
    value === "region" ||
    value === "island" ||
    value === "roadtrip"
  ) {
    return value;
  }
  return null;
}

export function scopeSearchRadii(scope: ExplorationScope): ScopeSearchRadii {
  switch (scope) {
    case "local":
      return { stay_radius_km: 15, explore_radius_km: 15 };
    case "region":
      return { stay_radius_km: 25, explore_radius_km: 90 };
    case "island":
      return { stay_radius_km: 30, explore_radius_km: 55 };
    case "roadtrip":
      return { stay_radius_km: 50, explore_radius_km: 280 };
  }
}

/** Mapuje scope na pola zapytania — nie nadpisuje promieni podanych przez użytkownika. */
export function applyExplorationScopeToQuery(
  query: ActivitySearchQuery,
  scope: ExplorationScope,
): ActivitySearchQuery {
  const radii = scopeSearchRadii(scope);
  const stay =
    query.stay_radius_km ?? query.max_radius_km ?? radii.stay_radius_km;
  const explore =
    query.explore_radius_km ??
    query.near_radius_km ??
    (query.near_lat != null ? radii.explore_radius_km : undefined);

  return {
    ...query,
    stay_radius_km: stay,
    explore_radius_km: explore,
    max_radius_km: stay,
    near_radius_km: explore,
  };
}

/** Rozwiązuje promienie z zapytania (nowe nazwy + legacy aliasy). */
export function resolveQueryRadii(query: ActivitySearchQuery): {
  stay_radius_km: number;
  explore_radius_km: number;
} {
  return {
    stay_radius_km: query.stay_radius_km ?? query.max_radius_km,
    explore_radius_km:
      query.explore_radius_km ?? query.near_radius_km ?? 150,
  };
}

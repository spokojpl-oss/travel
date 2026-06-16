import type { ActivitySearchQuery } from "@/types/domain";

export type ExplorationScope = "local" | "region" | "island" | "roadtrip";

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

export function scopeSearchRadii(scope: ExplorationScope): {
  max_radius_km: number;
  near_radius_km: number;
} {
  switch (scope) {
    case "local":
      return { max_radius_km: 15, near_radius_km: 50 };
    case "region":
      return { max_radius_km: 25, near_radius_km: 90 };
    case "island":
      return { max_radius_km: 30, near_radius_km: 55 };
    case "roadtrip":
      return { max_radius_km: 50, near_radius_km: 280 };
  }
}

export function applyExplorationScopeToQuery(
  query: ActivitySearchQuery,
  scope: ExplorationScope,
): ActivitySearchQuery {
  const radii = scopeSearchRadii(scope);
  return {
    ...query,
    max_radius_km: radii.max_radius_km,
    near_radius_km: query.near_lat != null ? radii.near_radius_km : undefined,
  };
}

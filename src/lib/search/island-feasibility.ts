import type { Locale } from "@/i18n/config";
import type { ExplorationScope } from "@/lib/search/exploration-scope";
import type { WeatherSummary } from "@/types/domain";
import { resolveDestinationSizeProfile } from "@/lib/search/destination-size";
import { hasChildrenInPassengers } from "@/lib/search/trip-rhythm";

export type IslandFeasibilityLevel = "ok" | "tight" | "too_short";

export type IslandFeasibilityAdvice = {
  level: IslandFeasibilityLevel;
  title: string;
  body: string;
  /** Suggested minimum days for whole-island with beach. */
  suggestedMinDays?: number;
  /** Alternative scopes when too short. */
  alternatives: Array<{
    action: "extend" | "narrow_scope";
    label: string;
    description: string;
  }>;
  /** Weather hint when hot. */
  weatherHint?: string;
};

export function assessIslandFeasibility({
  destinationLabel,
  tripDays,
  explorationScope,
  passengers,
  weather,
  locale = "pl",
}: {
  destinationLabel: string;
  tripDays: number;
  explorationScope: ExplorationScope;
  passengers?: string;
  weather?: WeatherSummary | null;
  locale?: Locale;
}): IslandFeasibilityAdvice | null {
  if (explorationScope !== "island") return null;

  const profile = resolveDestinationSizeProfile(destinationLabel);
  if (!profile || profile.kind !== "island") return null;

  const pl = locale !== "en";
  const withKids = hasChildrenInPassengers(passengers);
  const minWhole =
    profile.wholeWithBeachDays + (withKids ? profile.kidsExtraDays : 0);
  const minFast = profile.wholeSightseeingDays;

  let level: IslandFeasibilityLevel = "ok";
  if (tripDays < minFast) level = "too_short";
  else if (tripDays < minWhole) level = "tight";

  const alternatives: IslandFeasibilityAdvice["alternatives"] = [];

  if (level !== "ok") {
    alternatives.push({
      action: "extend",
      label: pl
        ? `Wydłuż do ~${minWhole} dni`
        : `Extend to ~${minWhole} days`,
      description: pl
        ? "Spokojne objechanie wyspy z czasem na plażę."
        : "Comfortably cover the island with beach time.",
    });
    alternatives.push({
      action: "narrow_scope",
      label: pl ? "Zawęź do jednego rejonu" : "Focus on one area",
      description: pl
        ? "Zmień zakres na „część wyspy” — mniej jazdy, więcej odpoczynku."
        : 'Switch to "part of island" — less driving, more relaxation.',
    });
  }

  let title: string;
  let body: string;

  if (level === "ok") {
    title = pl
      ? `${tripDays} dni na całą ${profile.name} — pasuje`
      : `${tripDays} days for all of ${profile.name} — looks good`;
    body = pl
      ? "Macie wystarczająco czasu, żeby objechać wyspę z plażowaniem. Na mapie filtrujcie typy atrakcji — nie musicie widzieć wszystkiego naraz."
      : "Enough time to cover the island with beach days. Filter activity types on the map — you don't need to see everything at once.";
  } else if (level === "tight") {
    title = pl
      ? `Mało dni na całą ${profile.name}`
      : `Short time for all of ${profile.name}`;
    body = pl
      ? `${tripDays} dni to napięty harmonogram${withKids ? " z dziećmi" : ""}. Da się, ale liczcie się z większą ilością jazdy albo wybierzcie rejon.`
      : `${tripDays} days is a packed schedule${withKids ? " with kids" : ""}. Doable, but expect more driving or pick one area.`;
  } else {
    title = pl
      ? `Za krótko na całą ${profile.name}`
      : `Too short for all of ${profile.name}`;
    body = pl
      ? `Przy ${tripDays} dniach trudno sensownie objechać całą wyspę z plażą. Polecamy wydłużyć pobyt (min. ~${minWhole} dni) albo wybrać jeden rejon.`
      : `With ${tripDays} days it's hard to cover the whole island with beach time. Extend the trip (~${minWhole} days) or pick one area.`;
  }

  let weatherHint: string | undefined;
  const avgMax = weather?.avg_temp_max;
  if (avgMax != null && avgMax >= 32) {
    weatherHint = pl
      ? `W terminie wyjazdu ok. ${Math.round(avgMax)}°C — zwiedzanie rano/wieczorem, w południe plaża w cieniu.`
      : `Trip dates ~${Math.round(avgMax)}°C — sightsee morning/evening, beach in shade at midday.`;
  } else if (avgMax != null && avgMax >= 28) {
    weatherHint = pl
      ? `Ciepło (${Math.round(avgMax)}°C) — mix plaży i zwiedzania w chłodniejszych godzinach.`
      : `Warm (${Math.round(avgMax)}°C) — mix beach and sightseeing in cooler hours.`;
  }

  return {
    level,
    title,
    body,
    suggestedMinDays: level !== "ok" ? minWhole : undefined,
    alternatives,
    weatherHint,
  };
}

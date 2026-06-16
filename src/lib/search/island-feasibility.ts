import type { Locale } from "@/i18n/config";
import type { ExplorationScope } from "@/lib/search/exploration-scope";
import type { WeatherSummary } from "@/types/domain";
import {
  resolveDestinationSizeProfile,
  wholeIslandDayTargets,
} from "@/lib/search/destination-size";
import { hasChildrenInPassengers } from "@/lib/search/trip-rhythm";

export type IslandFeasibilityLevel = "ok" | "tight" | "too_short";

export type IslandFeasibilityAdvice = {
  level: IslandFeasibilityLevel;
  title: string;
  body: string;
  suggestedMinDays?: number;
  alternatives: Array<{
    action: "extend" | "narrow_scope";
    label: string;
    description: string;
  }>;
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
  const targets = wholeIslandDayTargets(profile, withKids);

  let level: IslandFeasibilityLevel = "ok";
  if (tripDays < targets.active) level = "too_short";
  else if (tripDays < targets.relaxed) level = "tight";

  const alternatives: IslandFeasibilityAdvice["alternatives"] = [];

  if (level !== "ok") {
    alternatives.push({
      action: "extend",
      label: pl
        ? `Wydłuż do ~${targets.relaxed} dni`
        : `Extend to ~${targets.relaxed} days`,
      description: pl
        ? "Spokojniejszy objazd z czasem na plażę."
        : "A more relaxed loop with beach time.",
    });
    alternatives.push({
      action: "narrow_scope",
      label: pl ? "Zawęź do jednego rejonu" : "Focus on one area",
      description: pl
        ? "Mniej jazdy dziennie — wygodniej z dziećmi."
        : "Less daily driving — easier with kids.",
    });
  }

  let title: string;
  let body: string;

  if (level === "ok") {
    title = pl
      ? `${tripDays} dni na całą ${profile.name} — pasuje`
      : `${tripDays} days for all of ${profile.name} — looks good`;
    body = pl
      ? "Macie wystarczająco czasu na spokojny objazd z plażą. Na mapie filtrujcie typy atrakcji — nie musicie widzieć wszystkiego naraz."
      : "Enough time for a relaxed loop with beach days. Filter activity types on the map — you don't need to see everything at once.";
  } else if (level === "tight") {
    title = pl
      ? `${tripDays} dni na całą ${profile.name} — da się, ale w aktywnym tempie`
      : `${tripDays} days for all of ${profile.name} — doable at an active pace`;
    body = pl
      ? withKids
        ? `Objazd w ${tripDays} dni jest możliwy, ale liczcie krótsze transfery i mniej punktów dziennie. Z dziećmi wygodniej jeden rejon albo ~${targets.relaxed} dni na spokojniejsze tempo.`
        : `Da się objechać wyspę w ${tripDays} dni, ale raczej w aktywnym tempie. Na spokojniejszy objazd z plażą liczcie ~${targets.relaxed} dni.`
      : withKids
        ? `A ${tripDays}-day loop is possible with shorter daily drives. With kids, one area or ~${targets.relaxed} days is more relaxed.`
        : `You can loop the island in ${tripDays} days at an active pace. For a relaxed beach loop, plan ~${targets.relaxed} days.`;
  } else {
    title = pl
      ? `Za krótko na cały objazd ${profile.name}`
      : `Too short for a full loop of ${profile.name}`;
    body = pl
      ? withKids
        ? `Przy ${tripDays} dniach trudno sensownie objechać całą wyspę z dziećmi. Polecamy rejon albo ~${targets.relaxed} dni.`
        : `Przy ${tripDays} dniach trudno sensownie objechać całą wyspę. Polecamy rejon albo ~${targets.relaxed} dni z plażą.`
      : withKids
        ? `${tripDays} days is tight for a full island loop with kids. Try one area or ~${targets.relaxed} days.`
        : `${tripDays} days is tight for the whole island. Try one area or ~${targets.relaxed} days with beach time.`;
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
    suggestedMinDays: level !== "ok" ? targets.relaxed : undefined,
    alternatives,
    weatherHint,
  };
}

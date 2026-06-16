import type { Locale } from "@/i18n/config";
import type { ExplorationScope } from "@/lib/search/exploration-scope";
import { daysBetweenIso } from "@/lib/search/trip-context";
import {
  hasChildrenInPassengers,
} from "@/lib/search/trip-rhythm";
import {
  resolveDestinationSizeProfile,
  wholeIslandDayTargets,
  type DestinationKind,
} from "@/lib/search/destination-size";

export type ScopeOption = {
  value: ExplorationScope;
  label: string;
  description: string;
  /** Why this option exists for this trip. */
  rationale: string;
};

export type ScopeAdvice = {
  kind: DestinationKind;
  destinationName: string;
  tripDays: number;
  recommended: ExplorationScope;
  options: ScopeOption[];
  headline: string;
  summary: string;
};

function scopeLabels(
  scope: ExplorationScope,
  locale: Locale,
): { label: string; description: string } {
  const pl = locale !== "en";
  switch (scope) {
    case "local":
      return pl
        ? {
            label: "Jeden rejon",
            description:
              "Jedna baza — atrakcje w promieniu ok. 15 km, minimum dojazdów.",
          }
        : {
            label: "One area",
            description: "One base — attractions within ~15 km.",
          };
    case "region":
      return pl
        ? {
            label: "Część destynacji",
            description:
              "Wybrany rejon z mapą atrakcji — sensowne przy krótszym pobycie.",
          }
        : {
            label: "Part of destination",
            description: "Pick an area — good for shorter trips.",
          };
    case "island":
      return pl
        ? {
            label: "Cała wyspa / destynacja",
            description:
              "Mapa całego obszaru — zwiedzanie z kilkoma bazami lub wycieczkami.",
          }
        : {
            label: "Whole island / destination",
            description: "Full map — explore with day trips or changing bases.",
          };
    case "roadtrip":
      return pl
        ? {
            label: "Szeroko i elastycznie",
            description:
              "Więcej jazdy, zmiana bazy, okolice poza głównym obszarem.",
          }
        : {
            label: "Wide & flexible",
            description: "More driving, changing bases, wider surroundings.",
          };
  }
}

function buildIslandAdvice({
  profile,
  tripDays,
  withKids,
  locale,
}: {
  profile: NonNullable<ReturnType<typeof resolveDestinationSizeProfile>>;
  tripDays: number;
  withKids: boolean;
  locale: Locale;
}): ScopeAdvice {
  const pl = locale !== "en";
  const targets = wholeIslandDayTargets(profile, withKids);

  const canRelaxed = tripDays >= targets.relaxed;
  const canActive = tripDays >= targets.active;

  let recommended: ExplorationScope = "region";
  if (canRelaxed || canActive) recommended = "island";
  else if (tripDays <= 4) recommended = "local";

  const options: ScopeOption[] = [];

  const add = (scope: ExplorationScope, rationale: string) => {
    const { label, description } = scopeLabels(scope, locale);
    options.push({ value: scope, label, description, rationale });
  };

  if (canRelaxed) {
    add(
      "island",
      pl
        ? `${tripDays} dni wystarczy na spokojny objazd ${profile.name} z plażą — to nasza rekomendacja.`
        : `${tripDays} days is enough for a relaxed loop of ${profile.name} with beach time.`,
    );
  } else if (canActive) {
    add(
      "island",
      pl
        ? `${tripDays} dni — da się objechać całość w aktywnym tempie${withKids ? " (krótsze dojazdy dziennie)" : ""}.`
        : `${tripDays} days — whole island at an active pace${withKids ? " (shorter daily drives)" : ""}.`,
    );
  } else {
    add(
      "island",
      pl
        ? `${tripDays} dni to mało na spokojny objazd całej ${profile.name} — możliwe, ale ciasno.`
        : `${tripDays} days is tight for a relaxed loop of ${profile.name}.`,
    );
  }

  add(
    "region",
    pl
      ? `Przy ${tripDays} dniach jeden rejon = mniej jazdy${withKids ? " i wygodniej z dziećmi" : ""}.`
      : `With ${tripDays} days, one area means less driving${withKids ? " and easier with kids" : ""}.`,
  );

  if (tripDays >= 5) {
    add(
      "local",
      pl
        ? "Jedna baza — zero zmian noclegu, atrakcje w okolicy."
        : "One base — no hotel changes, nearby attractions.",
    );
  }

  if (tripDays >= 10) {
    add(
      "roadtrip",
      pl
        ? "Elastyczny objazd z kilkoma bazami — dla tych, którzy lubią jeździć."
        : "Flexible loop with several bases — for those who enjoy driving.",
    );
  }

  const kidsTag = withKids ? (pl ? " · z dziećmi" : " · with kids") : "";

  const headline = pl
    ? `${profile.name} · ${tripDays} dni${kidsTag}`
    : `${profile.name} · ${tripDays} days${kidsTag}`;

  let summary: string;
  if (canRelaxed) {
    summary = pl
      ? `Przy ${tripDays} dniach możecie spokojnie objechać całą wyspę — pokażemy mapę i dopasujemy plan.`
      : `With ${tripDays} days you can comfortably cover the whole island — we'll show a map and tailor the plan.`;
  } else if (canActive) {
    summary = pl
      ? withKids
        ? `Przy ${tripDays} dniach da się objechać ${profile.name}, ale w raczej aktywnym tempie. Z dziećmi wygodniej jeden rejon albo ~${targets.relaxed} dni na spokojniejszy objazd z plażą.`
        : `Przy ${tripDays} dniach objechacie ${profile.name} w aktywnym tempie — mapa całej wyspy ma sens.`
      : withKids
        ? `${tripDays} days works for ${profile.name} at an active pace. With kids, one area or ~${targets.relaxed} days is more relaxed.`
        : `${tripDays} days fits an active loop of ${profile.name} — a full-island map makes sense.`;
  } else {
    summary = pl
      ? withKids
        ? `Przy ${tripDays} dniach cała ${profile.name} to już spory objazd z dziećmi. Wygodniej jeden rejon albo ~${targets.relaxed} dni z czasem na plażę.`
        : `Przy ${tripDays} dniach cała ${profile.name} to spory objazd — proponujemy rejon albo ~${targets.relaxed} dni z plażą.`
      : withKids
        ? `${tripDays} days is a big loop of ${profile.name} with kids. One area or ~${targets.relaxed} days with beach time works better.`
        : `${tripDays} days is a lot for all of ${profile.name} — try one area or ~${targets.relaxed} days with beach time.`;
  }

  return {
    kind: "island",
    destinationName: profile.name,
    tripDays,
    recommended,
    options,
    headline,
    summary,
  };
}

function buildCityAdvice({
  profile,
  tripDays,
  withKids,
  locale,
}: {
  profile: NonNullable<ReturnType<typeof resolveDestinationSizeProfile>>;
  tripDays: number;
  withKids: boolean;
  locale: Locale;
}): ScopeAdvice {
  const pl = locale !== "en";
  let recommended: ExplorationScope = tripDays <= 3 ? "local" : "region";
  if (tripDays >= 7) recommended = "roadtrip";

  const options: ScopeOption[] = [];
  const add = (scope: ExplorationScope, rationale: string) => {
    const { label, description } = scopeLabels(scope, locale);
    options.push({ value: scope, label, description, rationale });
  };

  add(
    "local",
    pl
      ? `${profile.name} — jedna dzielnica / centrum, minimum dojazdów${withKids ? ", wygodne z dziećmi" : ""}.`
      : `${profile.name} — one district / centre, minimal travel${withKids ? ", kid-friendly" : ""}.`,
  );

  add(
    "region",
    pl
      ? `Całe miasto + okolice — sensowne przy ${tripDays} dniach.`
      : `Whole city + surroundings — fits ${tripDays} days well.`,
  );

  if (tripDays >= 5) {
    add(
      "roadtrip",
      pl
        ? "Wycieczki poza miasto (np. Costa Brava, Montserrat) — więcej jazdy."
        : "Day trips outside the city — more driving.",
    );
  }

  const headline = pl
    ? `${profile.name} · ${tripDays} dni`
    : `${profile.name} · ${tripDays} days`;

  const summary = pl
    ? `${profile.name} to miasto — nie dzielimy go na „wyspy”. Proponujemy zakres dopasowany do długości pobytu.`
    : `${profile.name} is a city — we won't ask about "parts of an island". We'll match scope to your trip length.`;

  return {
    kind: "city",
    destinationName: profile.name,
    tripDays,
    recommended,
    options,
    headline,
    summary,
  };
}

function buildRegionAdvice({
  profile,
  tripDays,
  withKids,
  locale,
}: {
  profile: NonNullable<ReturnType<typeof resolveDestinationSizeProfile>>;
  tripDays: number;
  withKids: boolean;
  locale: Locale;
}): ScopeAdvice {
  const pl = locale !== "en";
  const minWhole = profile.wholeWithBeachDays + (withKids ? profile.kidsExtraDays : 0);
  const recommended: ExplorationScope =
    tripDays >= minWhole ? "island" : tripDays >= 7 ? "region" : "local";

  const options: ScopeOption[] = [];
  const add = (scope: ExplorationScope, rationale: string) => {
    const { label, description } = scopeLabels(scope, locale);
    options.push({ value: scope, label, description, rationale });
  };

  add(
    "region",
    pl
      ? `${profile.name} jest duża — przy ${tripDays} dniach jeden rejon to bezpieczny wybór.`
      : `${profile.name} is large — one area works well for ${tripDays} days.`,
  );

  if (tripDays >= minWhole) {
    add(
      "island",
      pl
        ? `${tripDays} dni pozwala objechać większość ${profile.name}.`
        : `${tripDays} days lets you cover most of ${profile.name}.`,
    );
  }

  add(
    "local",
    pl
      ? "Jedna baza w wybranym mieście — minimum transferów."
      : "One base in a chosen town — minimal transfers.",
  );

  if (tripDays >= 10 && !withKids) {
    add(
      "roadtrip",
      pl
        ? "Objazd z kilkoma bazami — dla doświadczonych podróżników."
        : "Multi-base road trip — for experienced travelers.",
    );
  }

  return {
    kind: "region",
    destinationName: profile.name,
    tripDays,
    recommended,
    options,
    headline: pl
      ? `${profile.name} · ${tripDays} dni${withKids ? " · z dziećmi" : ""}`
      : `${profile.name} · ${tripDays} days${withKids ? " · with kids" : ""}`,
    summary: pl
      ? `${profile.name} to duży obszar (~${profile.areaKm2} km²) — dopasowaliśmy zakres do ${tripDays} dni.`
      : `${profile.name} is a large area (~${profile.areaKm2} km²) — scope matched to ${tripDays} days.`,
  };
}

export function adviseExplorationScope({
  destinationLabel,
  departureDate,
  returnDate,
  passengers,
  locale = "pl",
}: {
  destinationLabel: string;
  departureDate: string;
  returnDate: string | null;
  passengers?: string;
  locale?: Locale;
}): ScopeAdvice {
  const tripDays = daysBetweenIso(departureDate, returnDate ?? departureDate);
  const withKids = hasChildrenInPassengers(passengers);
  const profile = resolveDestinationSizeProfile(destinationLabel);

  const pl = locale !== "en";

  if (!profile) {
    const recommended: ExplorationScope = tripDays <= 4 ? "local" : "region";
    const { label, description } = scopeLabels(recommended, locale);
    return {
      kind: "city",
      destinationName: destinationLabel.split(",")[0]?.trim() ?? destinationLabel,
      tripDays,
      recommended,
      options: [
        {
          value: "local",
          label: scopeLabels("local", locale).label,
          description: scopeLabels("local", locale).description,
          rationale: pl ? "Krótki pobyt — trzymaj się jednego rejonu." : "Short trip — stay in one area.",
        },
        {
          value: "region",
          label: scopeLabels("region", locale).label,
          description: scopeLabels("region", locale).description,
          rationale: pl ? "Dłuższy pobyt — szerszy obszar." : "Longer trip — wider area.",
        },
      ],
      headline: pl ? `${tripDays} dni` : `${tripDays} days`,
      summary: pl
        ? "Nie mamy profilu wielkości tego miejsca — wybierz zakres ręcznie."
        : "No size profile for this place — pick scope manually.",
    };
  }

  if (profile.kind === "island") {
    return buildIslandAdvice({ profile, tripDays, withKids, locale });
  }
  if (profile.kind === "city") {
    return buildCityAdvice({ profile, tripDays, withKids, locale });
  }
  return buildRegionAdvice({ profile, tripDays, withKids, locale });
}

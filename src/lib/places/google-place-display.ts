import type { GooglePlace } from "@/lib/api/google-places";
import type { Locale } from "@/i18n/config";

export type InferredServiceKind =
  | "quads"
  | "buggies"
  | "motorbike_rental"
  | "bike_rental"
  | "ebike_rental"
  | "car_rental"
  | "kayaking"
  | "diving"
  | "snorkeling"
  | "surfing"
  | "paragliding"
  | "jet_ski"
  | "boat_tour"
  | "water_park"
  | "theme_park"
  | "zoo"
  | "aquarium"
  | "museum"
  | "hiking_trails"
  | "climbing"
  | "travel_agency"
  | "other";

type ServiceMeta = {
  kind: InferredServiceKind;
  label_pl: string;
  label_en: string;
  desc_pl: string;
  desc_en: string;
};

const SERVICE_META: Record<InferredServiceKind, Omit<ServiceMeta, "kind">> = {
  quads: {
    label_pl: "Quady (ATV)",
    label_en: "Quad / ATV rental",
    desc_pl: "Wypożyczalnia quadów — jazda po okolicy, często z krótkim briefingiem.",
    desc_en: "ATV rental — ride in the area, usually with a short safety briefing.",
  },
  buggies: {
    label_pl: "Buggy / UTV",
    label_en: "Buggy rental",
    desc_pl: "Wypożyczalnia buggy — większe pojazdy off-road, często na pary.",
    desc_en: "Buggy rental — larger off-road vehicles, often for two people.",
  },
  motorbike_rental: {
    label_pl: "Motorowery / skutery",
    label_en: "Motorbike / scooter rental",
    desc_pl: "Wynajem motorowerów lub skuterów — dojazd po okolicy bez auta.",
    desc_en: "Motorbike or scooter rental — get around without a car.",
  },
  bike_rental: {
    label_pl: "Rowery",
    label_en: "Bike rental",
    desc_pl: "Wypożyczalnia rowerów — na promenadę, plażę lub krótsze trasy.",
    desc_en: "Bicycle rental — for the promenade, beach or short routes.",
  },
  ebike_rental: {
    label_pl: "Rowery elektryczne",
    label_en: "E-bike rental",
    desc_pl: "Wypożyczalnia e-bike — łatwiejsze pokonywanie wzniesień.",
    desc_en: "E-bike rental — easier on hills and longer distances.",
  },
  car_rental: {
    label_pl: "Samochody",
    label_en: "Car rental",
    desc_pl: "Wypożyczalnia aut — na wycieczki po wyspie lub okolicy.",
    desc_en: "Car rental — for day trips around the island or region.",
  },
  kayaking: {
    label_pl: "Kajaki",
    label_en: "Kayak rental",
    desc_pl: "Wypożyczalnia kajaków lub krótkie spływy z przewodnikiem.",
    desc_en: "Kayak rental or short guided paddles.",
  },
  diving: {
    label_pl: "Nurkowanie",
    label_en: "Diving center",
    desc_pl: "Centrum nurkowe — kursy, wypożyczenie sprzętu, wyjścia na rafy.",
    desc_en: "Dive center — courses, gear rental and reef trips.",
  },
  snorkeling: {
    label_pl: "Snorkeling",
    label_en: "Snorkeling",
    desc_pl: "Snorkeling — wypożyczenie maski i krótki rejs do spokojnej zatoki.",
    desc_en: "Snorkeling — mask rental and short trips to calm bays.",
  },
  surfing: {
    label_pl: "Surfing",
    label_en: "Surf school",
    desc_pl: "Szkoła surfingu — lekcje na plaży z instruktorem.",
    desc_en: "Surf school — beach lessons with an instructor.",
  },
  paragliding: {
    label_pl: "Paralotnia",
    label_en: "Paragliding",
    desc_pl: "Loty tandemowe z instruktorem — rezerwacja z wyprzedzeniem.",
    desc_en: "Tandem flights with an instructor — book ahead.",
  },
  jet_ski: {
    label_pl: "Skutery wodne",
    label_en: "Jet ski rental",
    desc_pl: "Wynajem skuterów wodnych — zwykle na wyznaczonej wodzie.",
    desc_en: "Jet ski rental — usually in designated water areas.",
  },
  boat_tour: {
    label_pl: "Rejsy łodzią",
    label_en: "Boat tours",
    desc_pl: "Rejsy wycieczkowe — plaże, jaskinie morskie, zachód słońca.",
    desc_en: "Boat trips — beaches, sea caves, sunset cruises.",
  },
  water_park: {
    label_pl: "Aquapark",
    label_en: "Water park",
    desc_pl: "Park wodny — całodniowa atrakcja z dziećmi.",
    desc_en: "Water park — full-day family attraction.",
  },
  theme_park: {
    label_pl: "Park rozrywki",
    label_en: "Theme park",
    desc_pl: "Park rozrywki — kolejki, atrakcje dla rodzin.",
    desc_en: "Theme park — rides and family attractions.",
  },
  zoo: {
    label_pl: "Zoo / park zwierząt",
    label_en: "Zoo / wildlife park",
    desc_pl: "Zoo lub park z zwierzętami — spokojniejszy dzień poza plażą.",
    desc_en: "Zoo or wildlife park — a calmer day away from the beach.",
  },
  aquarium: {
    label_pl: "Aquarium",
    label_en: "Aquarium",
    desc_pl: "Aquarium — zwierzęta morskie, dobre na upalne popołudnie.",
    desc_en: "Aquarium — marine life, good on hot afternoons.",
  },
  museum: {
    label_pl: "Muzeum",
    label_en: "Museum",
    desc_pl: "Muzeum lub wystawa — kultura i historia regionu.",
    desc_en: "Museum or exhibition — local culture and history.",
  },
  hiking_trails: {
    label_pl: "Wycieczki piesze",
    label_en: "Hiking / walking tours",
    desc_pl: "Przewodnik lub biuro wycieczek pieszych.",
    desc_en: "Guided walking or hiking tours.",
  },
  climbing: {
    label_pl: "Wspinaczka",
    label_en: "Climbing",
    desc_pl: "Wspinaczka — ścianka lub skałki z instruktorem.",
    desc_en: "Climbing — gym or outdoor routes with a guide.",
  },
  travel_agency: {
    label_pl: "Biuro wycieczek",
    label_en: "Tour agency",
    desc_pl: "Biuro podróży — organizowane wycieczki jednodniowe.",
    desc_en: "Tour agency — organised day trips.",
  },
  other: {
    label_pl: "Usługa turystyczna",
    label_en: "Tourist service",
    desc_pl: "Lokalna firma z Google Maps — sprawdź ofertę na stronie lub w mapach.",
    desc_en: "Local business from Google Maps — check their offer online.",
  },
};

const NAME_RULES: Array<{ pattern: RegExp; kind: InferredServiceKind }> = [
  { pattern: /\bbuggy\b|\butv\b|dune buggy/i, kind: "buggies" },
  { pattern: /\bquad\b|\batv\b|four.?wheel|4x4/i, kind: "quads" },
  {
    pattern: /motorbike|motorcycle|moto rent|scooter rent|milis bikes/i,
    kind: "motorbike_rental",
  },
  { pattern: /e-?bike|ebike|electric bike|elektr/i, kind: "ebike_rental" },
  { pattern: /bike rent|bicycle|rower/i, kind: "bike_rental" },
  { pattern: /car rent|rent a car|wynajem aut/i, kind: "car_rental" },
  { pattern: /kayak|kanu|canoe/i, kind: "kayaking" },
  { pattern: /div(e|ing)|scuba|nurk/i, kind: "diving" },
  { pattern: /snorkel/i, kind: "snorkeling" },
  { pattern: /surf/i, kind: "surfing" },
  { pattern: /paraglid|paralotn/i, kind: "paragliding" },
  { pattern: /jet\s*ski/i, kind: "jet_ski" },
  { pattern: /boat tour|cruise|rejs|excursion/i, kind: "boat_tour" },
  { pattern: /water park|aquapark/i, kind: "water_park" },
  { pattern: /theme park|amusement/i, kind: "theme_park" },
  { pattern: /\bzoo\b|wildlife/i, kind: "zoo" },
  { pattern: /aquarium|dolphin/i, kind: "aquarium" },
  { pattern: /museum|muze/i, kind: "museum" },
  { pattern: /hiking|trekking|wędr/i, kind: "hiking_trails" },
  { pattern: /climb/i, kind: "climbing" },
];

const GENERIC_RENTAL = /\brent|\brental|wypożycz|\bhire\b/i;

const GOOGLE_TYPE_TO_KIND: Record<string, InferredServiceKind> = {
  car_rental: "car_rental",
  travel_agency: "travel_agency",
  bicycle_store: "bike_rental",
  sports_activity_location: "other",
  tourist_attraction: "other",
  amusement_center: "theme_park",
  aquarium: "aquarium",
  zoo: "zoo",
  museum: "museum",
};

const ACTIVITY_TO_KIND: Record<string, InferredServiceKind> = {
  quads: "quads",
  buggies: "buggies",
  bike_rental: "bike_rental",
  ebike_rental: "ebike_rental",
  mountain_biking: "bike_rental",
  car_rental: "car_rental",
  kayaking: "kayaking",
  diving: "diving",
  snorkeling: "snorkeling",
  surfing: "surfing",
  paragliding: "paragliding",
  jet_ski: "jet_ski",
  boat_tour: "boat_tour",
  water_parks: "water_park",
  theme_parks: "theme_park",
  zoo: "zoo",
  aquarium: "aquarium",
  museums: "museum",
  hiking_trails: "hiking_trails",
  climbing: "climbing",
};

function haystack(place: GooglePlace): string {
  return `${place.name} ${place.types.join(" ")} ${place.editorial_summary ?? ""}`.toLowerCase();
}

export function inferServiceKind(
  place: GooglePlace,
  selectedActivities: string[] = [],
): InferredServiceKind {
  const text = haystack(place);

  for (const { pattern, kind } of NAME_RULES) {
    if (!pattern.test(text)) continue;
    if (
      kind === "motorbike_rental" &&
      /\b(buggy|quad|atv|four.?wheel)\b/i.test(text)
    ) {
      continue;
    }
    return kind;
  }

  for (const activity of selectedActivities) {
    const mapped = ACTIVITY_TO_KIND[activity];
    if (mapped && mapped !== "other") {
      const activityWords = activity.replace(/_/g, " ");
      if (text.includes(activityWords) || text.includes(activity.replace(/_/g, ""))) {
        return mapped;
      }
    }
  }

  for (const type of place.types) {
    const mapped = GOOGLE_TYPE_TO_KIND[type];
    if (mapped) return mapped;
  }

  if (selectedActivities.length === 1) {
    const only = ACTIVITY_TO_KIND[selectedActivities[0]!];
    if (only) return only;
  }

  if (GENERIC_RENTAL.test(text)) {
    for (const activity of selectedActivities) {
      const mapped = ACTIVITY_TO_KIND[activity];
      if (mapped && mapped !== "other") return mapped;
    }
    return "other";
  }

  if (selectedActivities.length > 0) {
    for (const activity of selectedActivities) {
      const mapped = ACTIVITY_TO_KIND[activity];
      if (mapped && mapped !== "other") return mapped;
    }
  }

  return "other";
}

/** Tylko miejsca, których typ odpowiada wybranym aktywnościom (bez „other”). */
export function filterLocalServicesForActivities(
  places: GooglePlace[],
  selectedActivities: string[] = [],
): GooglePlace[] {
  if (selectedActivities.length === 0) return [];

  const relevantKinds = new Set(
    selectedActivities
      .map((a) => ACTIVITY_TO_KIND[a])
      .filter((k): k is InferredServiceKind => k != null && k !== "other"),
  );

  if (relevantKinds.size === 0) return [];

  return places.filter((place) => {
    const kind = inferServiceKind(place, selectedActivities);
    return relevantKinds.has(kind);
  });
}

export function serviceKindMeta(
  kind: InferredServiceKind,
  locale: Locale = "pl",
): { label: string; description: string } {
  const meta = SERVICE_META[kind];
  const pl = locale !== "en";
  return {
    label: pl ? meta.label_pl : meta.label_en,
    description: pl ? meta.desc_pl : meta.desc_en,
  };
}

export function ratingLabel(
  rating: number,
  locale: Locale = "pl",
): { text: string; tone: "great" | "good" | "fair" | "low" } {
  const pl = locale !== "en";
  if (rating >= 4.7) {
    return { text: pl ? "świetna" : "excellent", tone: "great" };
  }
  if (rating >= 4.3) {
    return { text: pl ? "bardzo dobra" : "very good", tone: "good" };
  }
  if (rating >= 3.8) {
    return { text: pl ? "dobra" : "good", tone: "fair" };
  }
  return { text: pl ? "słabsza" : "mixed reviews", tone: "low" };
}

export function formatRating(
  rating: number,
  count: number | null,
  locale: Locale = "pl",
): string {
  const pl = locale !== "en";
  const { text } = ratingLabel(rating, locale);
  const base = pl
    ? `Ocena Google: ${rating.toFixed(1)} (${text})`
    : `Google rating: ${rating.toFixed(1)} (${text})`;
  if (count != null && count > 0) {
    return pl
      ? `${base} · ${count} opinii`
      : `${base} · ${count} reviews`;
  }
  return base;
}

/** Skrócony adres — bez powtarzania nazwy miasta na końcu. */
export function shortenAddress(address: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 2) return address;
  return parts.slice(0, -1).join(", ");
}

export type GroupedLocalService = {
  kind: InferredServiceKind;
  label: string;
  description: string;
  places: Array<
    GooglePlace & {
      kind: InferredServiceKind;
      kindLabel: string;
      kindDescription: string;
      ratingText: string | null;
      ratingTone: "great" | "good" | "fair" | "low" | null;
      shortAddress: string | null;
    }
  >;
};

export function groupLocalServices(
  places: GooglePlace[],
  {
    locale = "pl",
    selectedActivities = [],
    limitPerGroup = 5,
  }: {
    locale?: Locale;
    selectedActivities?: string[];
    limitPerGroup?: number;
  } = {},
): GroupedLocalService[] {
  const byKind = new Map<InferredServiceKind, GroupedLocalService["places"]>();

  for (const place of places) {
    const kind = inferServiceKind(place, selectedActivities);
    const meta = serviceKindMeta(kind, locale);
    const ratingTone = place.rating != null ? ratingLabel(place.rating, locale).tone : null;
    const enriched = {
      ...place,
      kind,
      kindLabel: meta.label,
      kindDescription: meta.description,
      ratingText:
        place.rating != null
          ? formatRating(place.rating, place.rating_count, locale)
          : null,
      ratingTone,
      shortAddress: shortenAddress(place.address),
    };
    const list = byKind.get(kind) ?? [];
    list.push(enriched);
    byKind.set(kind, list);
  }

  const priority = selectedActivities
    .map((a) => ACTIVITY_TO_KIND[a])
    .filter(Boolean) as InferredServiceKind[];

  const sortKinds = (a: InferredServiceKind, b: InferredServiceKind): number => {
    const ai = priority.indexOf(a);
    const bi = priority.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    }
    if (a === "other") return 1;
    if (b === "other") return -1;
    return 0;
  };

  return [...byKind.entries()]
    .sort(([a], [b]) => sortKinds(a, b))
    .map(([kind, list]) => {
      const meta = serviceKindMeta(kind, locale);
      return {
        kind,
        label: meta.label,
        description: meta.description,
        places: list
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
          .slice(0, limitPerGroup),
      };
    });
}

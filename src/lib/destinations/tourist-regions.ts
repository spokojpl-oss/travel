import type { Locale } from "@/i18n/config";
import type { TripDayTheme, TripRhythm } from "@/lib/search/trip-rhythm";
import { activeThemes } from "@/lib/search/trip-rhythm";

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

const TOURIST_REGIONS: TouristRegion[] = [
  {
    id: "al-ksamil",
    destination_keys: ["saranda", "albania", "ksamil"],
    slug: "ksamil-saranda",
    name_pl: "Ksamil i Saranda",
    name_en: "Ksamil & Saranda",
    character: "resort",
    vibe: "popular",
    overview_pl:
      "Najpopularniejsza baza na albańskiej rivierze — turkusowe plaże Ksamil, promenada w Sarandzie i łatwy dojazd do Butrintu.",
    overview_en:
      "The most popular base on the Albanian Riviera — turquoise Ksamil beaches, Saranda promenade, easy day trip to Butrint.",
    stay_hint_pl:
      "Dobra baza na plażowanie i wycieczki po południu — hotele i apartamenty w Ksamil i Sarandzie.",
    stay_hint_en:
      "Good base for beach days and afternoon trips — hotels and apartments in Ksamil and Saranda.",
    center_lat: 39.77,
    center_lon: 20.0,
    picks: [
      {
        day_theme: "beach_relax",
        name_pl: "Plaże Ksamil",
        name_en: "Ksamil beaches",
        why_pl: "Turkusowa woda i wysepki — najczęściej polecane plaże Albanii.",
        why_en: "Turquoise water and islets — Albania's most recommended beaches.",
        activity_slugs: ["sandy_beaches", "boat_tour"],
        rank: 1,
      },
      {
        day_theme: "beach_relax",
        name_pl: "Mirror Beach",
        name_en: "Mirror Beach",
        why_pl: "Mniej tłumów niż Ksamil, 10–15 min jazdy na południe.",
        why_en: "Less crowded than Ksamil, 10–15 min drive south.",
        activity_slugs: ["sandy_beaches"],
        rank: 2,
      },
      {
        day_theme: "city_culture",
        name_pl: "Butrint (UNESCO)",
        name_en: "Butrint (UNESCO)",
        why_pl: "Ruiny grecko-rzymskie nad laguną — klasyk jednodniowej wycieczki z Sarandy.",
        why_en: "Greco-Roman ruins by the lagoon — classic day trip from Saranda.",
        activity_slugs: ["archaeology", "old_towns"],
        rank: 1,
      },
      {
        day_theme: "city_culture",
        name_pl: "Saranda — promenada i forteca",
        name_en: "Saranda promenade & castle",
        why_pl: "Wieczorny spacer, kawiarnie, widok na zatokę.",
        why_en: "Evening stroll, cafés, bay views.",
        activity_slugs: ["old_towns", "viewpoints"],
        rank: 2,
      },
    ],
  },
  {
    id: "al-dhermi",
    destination_keys: ["saranda", "albania", "dhermi", "vlore", "vlorë"],
    slug: "dhermi-riviera",
    name_pl: "Dhërmi i albańska riviera",
    name_en: "Dhërmi & Albanian Riviera",
    character: "wild",
    vibe: "offbeat",
    overview_pl:
      "Dziksze plaże między górami a morzem — mniej infrastruktury niż Ksamil, bardziej „odkrywczo”.",
    overview_en:
      "Wilder beaches between mountains and sea — less infrastructure than Ksamil, more exploratory.",
    stay_hint_pl:
      "Wybierz mały hotel lub apartament w Dhërmi lub okolicy — samochód praktycznie konieczny.",
    stay_hint_en:
      "Pick a small hotel or apartment in Dhërmi — a car is practically essential.",
    center_lat: 40.15,
    center_lon: 19.64,
    picks: [
      {
        day_theme: "beach_relax",
        name_pl: "Plaża Dhërmi",
        name_en: "Dhërmi beach",
        why_pl: "Długi odcinek kamienisto-piaszczysty, mniej masowej turystyki.",
        why_en: "Long pebble-sand stretch, less mass tourism.",
        activity_slugs: ["rocky_beaches", "sandy_beaches"],
        rank: 1,
      },
      {
        day_theme: "beach_relax",
        name_pl: "Plaża Gjipe (wąwóz)",
        name_en: "Gjipe beach (canyon)",
        why_pl: "Plaża na końcu wąwozu — krótki trekking, spektakularne zdjęcia.",
        why_en: "Beach at the canyon end — short hike, spectacular photos.",
        activity_slugs: ["rocky_beaches", "hiking_trails"],
        rank: 2,
      },
      {
        day_theme: "nature",
        name_pl: "Wąwóz Gjipe",
        name_en: "Gjipe canyon",
        why_pl: "Półdniowa wędrówka do ukrytej plaży.",
        why_en: "Half-day hike to a hidden beach.",
        activity_slugs: ["hiking_trails", "canyons"],
        rank: 1,
      },
      {
        day_theme: "city_culture",
        name_pl: "Berat (wycieczka)",
        name_en: "Berat (day trip)",
        why_pl: "„Miasto tysiąca okien” — UNESCO, ok. 2,5 h jazdy.",
        why_en: "The \"city of a thousand windows\" — UNESCO, ~2.5 h drive.",
        activity_slugs: ["old_towns", "museums"],
        rank: 1,
      },
    ],
  },
  {
    id: "es-lanzarote-playa-blanca",
    destination_keys: ["lanzarote", "yaiza", "playa blanca"],
    slug: "playa-blanca-yaiza",
    name_pl: "Playa Blanca i południe",
    name_en: "Playa Blanca & south",
    character: "resort",
    vibe: "popular",
    overview_pl:
      "Spokojniejsza baza na południu wyspy — plaże, prom i blisko Timanfaya.",
    overview_en:
      "Quieter base in the south — beaches, promenade, close to Timanfaya.",
    stay_hint_pl:
      "Rodzinne resorty i apartamenty; prom na Fuerteventurę z portu.",
    stay_hint_en:
      "Family resorts and apartments; ferry to Fuerteventura from the port.",
    center_lat: 28.86,
    center_lon: -13.86,
    picks: [
      {
        day_theme: "beach_relax",
        name_pl: "Playa Papagayo",
        name_en: "Papagayo beaches",
        why_pl: "Zatoczki z białym piaskiem — najczęściej polecane na południu.",
        why_en: "White-sand coves — most recommended in the south.",
        activity_slugs: ["sandy_beaches", "boat_tour"],
        rank: 1,
      },
      {
        day_theme: "nature",
        name_pl: "Timanfaya",
        name_en: "Timanfaya National Park",
        why_pl: "Krajobraz wulkaniczny — obowiązkowy punkt Lanzarote.",
        why_en: "Volcanic landscape — Lanzarote must-see.",
        activity_slugs: ["national_parks", "viewpoints"],
        rank: 1,
      },
      {
        day_theme: "active_outdoor",
        name_pl: "Wędrówki po Parku Timanfaya",
        name_en: "Timanfaya guided routes",
        why_pl: "Rezerwacja wstępu z przewodnikiem — unikalny krajobraz geologiczny.",
        why_en: "Guided park access — unique geological scenery.",
        activity_slugs: ["hiking_trails", "national_parks"],
        rank: 1,
      },
    ],
  },
  {
    id: "es-lanzarote-puerto-carmen",
    destination_keys: ["lanzarote", "puerto del carmen", "arrecife"],
    slug: "puerto-del-carmen",
    name_pl: "Puerto del Carmen",
    name_en: "Puerto del Carmen",
    character: "resort",
    vibe: "popular",
    overview_pl:
      "Największy kurort na wyspie — plaża, restauracje, łatwy wypad w całą Lanzarote.",
    overview_en:
      "The island's largest resort — beach, restaurants, easy access to all Lanzarote.",
    stay_hint_pl: "Dużo hoteli all-inclusive; dobra baza na pierwszy wyjazd.",
    stay_hint_en: "Many all-inclusive hotels; good base for a first trip.",
    center_lat: 28.92,
    center_lon: -13.67,
    picks: [
      {
        day_theme: "beach_relax",
        name_pl: "Playa Grande (Puerto del Carmen)",
        name_en: "Playa Grande",
        why_pl: "Główna plaża kurortu — długa, piaszczysta, z łagodnym zejściem.",
        why_en: "Main resort beach — long, sandy, gentle slope.",
        activity_slugs: ["sandy_beaches"],
        rank: 1,
      },
      {
        day_theme: "city_culture",
        name_pl: "Arrecife i Castillo de San Gabriel",
        name_en: "Arrecife & San Gabriel castle",
        why_pl: "Stolica wyspy — 15 min autobusem, spacer nad laguną.",
        why_en: "Island capital — 15 min by bus, lagoon walk.",
        activity_slugs: ["old_towns", "castles"],
        rank: 1,
      },
      {
        day_theme: "active_outdoor",
        name_pl: "Nurkowanie / snorkeling",
        name_en: "Diving & snorkeling",
        why_pl: "Centra nurkowe w kurorcie — Atlantyk z czystą wodą.",
        why_en: "Dive centres in resort — Atlantic with clear water.",
        activity_slugs: ["snorkeling", "diving"],
        rank: 1,
      },
    ],
  },
  {
    id: "gr-crete-chania",
    destination_keys: ["kreta", "crete", "chania", "hania"],
    slug: "chania-west",
    name_pl: "Chania i zachodnia Kreta",
    name_en: "Chania & western Crete",
    character: "mixed",
    vibe: "balanced",
    overview_pl:
      "Wenecki stary port, plaże Balos i Falassarna — mix zwiedzania i plażowania.",
    overview_en:
      "Venetian old harbour, Balos and Falassarna beaches — culture and beach mix.",
    stay_hint_pl:
      "Baza w Chani lub małej miejscowości (Agia Marina, Platanias) — wynajem auta praktyczny.",
    stay_hint_en:
      "Base in Chania or nearby (Agia Marina) — car rental recommended.",
    center_lat: 35.51,
    center_lon: 24.02,
    picks: [
      {
        day_theme: "city_culture",
        name_pl: "Stary port w Chanii",
        name_en: "Chania old harbour",
        why_pl: "Latarnia morska, meczety, tawerny — serce zachodniej Krety.",
        why_en: "Lighthouse, mosques, tavernas — heart of western Crete.",
        activity_slugs: ["old_towns", "museums"],
        rank: 1,
      },
      {
        day_theme: "beach_relax",
        name_pl: "Balos",
        name_en: "Balos lagoon",
        why_pl: "Laguna w odcieniach błękitu — wymaga wczesnego wyjazdu lub łodzi.",
        why_en: "Multi-blue lagoon — early start or boat trip required.",
        activity_slugs: ["sandy_beaches", "boat_tour"],
        rank: 1,
      },
      {
        day_theme: "beach_relax",
        name_pl: "Falassarna",
        name_en: "Falassarna",
        why_pl: "Długa piaszczysta plaża zachodu — zachód słońca.",
        why_en: "Long western sandy beach — sunset spot.",
        activity_slugs: ["sandy_beaches"],
        rank: 2,
      },
      {
        day_theme: "nature",
        name_pl: "Wąwóz Samaria (sezon)",
        name_en: "Samaria gorge (seasonal)",
        why_pl: "Klasyczna całodzienna wędrówka — rezerwacja z wyprzedzeniem.",
        why_en: "Classic full-day hike — book ahead.",
        activity_slugs: ["hiking_trails", "canyons"],
        rank: 1,
      },
    ],
  },
  {
    id: "gr-crete-elafonisi",
    destination_keys: ["kreta", "crete", "elafonisi", "kissamos"],
    slug: "elafonisi-southwest",
    name_pl: "Elafonisi i południowy zachód",
    name_en: "Elafonisi & southwest",
    character: "wild",
    vibe: "offbeat",
    overview_pl:
      "Różowe piaski Elafonisi i dzikie zachodnie wybrzeże — mniej zatłoczone niż północ.",
    overview_en:
      "Elafonisi pink sands and wild west coast — less crowded than the north.",
    stay_hint_pl: "Małe hotele w Kissamos lub Paleochora — spokojniejszy rytm.",
    stay_hint_en: "Small hotels in Kissamos or Paleochora — slower pace.",
    center_lat: 35.27,
    center_lon: 23.54,
    picks: [
      {
        day_theme: "beach_relax",
        name_pl: "Elafonisi",
        name_en: "Elafonisi beach",
        why_pl: "Różowy piasek i płytkie laguny — jedna z najsłynniejszych plaż Krety.",
        why_en: "Pink sand and shallow lagoons — one of Crete's most famous beaches.",
        activity_slugs: ["sandy_beaches"],
        rank: 1,
      },
      {
        day_theme: "beach_relax",
        name_pl: "Kedrodasos",
        name_en: "Kedrodasos",
        why_pl: "Dzika plaża z cedrami — alternatywa dla tłumów Elafonisi.",
        why_en: "Wild cedar beach — alternative to Elafonisi crowds.",
        activity_slugs: ["rocky_beaches"],
        rank: 2,
      },
      {
        day_theme: "city_culture",
        name_pl: "Paleochora",
        name_en: "Paleochora",
        why_pl: "Małe miasteczko z dwiema plażami — spokojne wieczory.",
        why_en: "Small town with two beaches — quiet evenings.",
        activity_slugs: ["old_towns", "sandy_beaches"],
        rank: 1,
      },
    ],
  },
];

function normalizeDestinationKey(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[,]/g, " ")
    .trim();
}

export function destinationKeysFromLabel(label: string): string[] {
  const norm = normalizeDestinationKey(label);
  const parts = norm.split(/\s+/).filter(Boolean);
  const keys = new Set<string>([norm, ...parts]);
  for (const entry of TOURIST_REGIONS) {
    for (const key of entry.destination_keys) {
      if (norm.includes(key) || key.includes(norm)) keys.add(key);
    }
  }
  return [...keys];
}

function regionMatchesDestination(region: TouristRegion, label: string): boolean {
  const norm = normalizeDestinationKey(label);
  return region.destination_keys.some(
    (key) => norm.includes(key) || key.includes(norm.split(",")[0]?.trim() ?? norm),
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

export function findTouristRegions({
  destinationLabel,
  rhythm,
  limit = 6,
}: {
  destinationLabel: string;
  rhythm: TripRhythm;
  limit?: number;
}): ScoredTouristRegion[] {
  return TOURIST_REGIONS.filter((r) => regionMatchesDestination(r, destinationLabel))
    .map((r) => scoreRegionForRhythm(r, rhythm))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getTouristRegionById(id: string): TouristRegion | null {
  return TOURIST_REGIONS.find((r) => r.id === id) ?? null;
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

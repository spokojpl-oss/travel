import type { Locale } from "@/i18n/config";
import { resolveCuratedHeroImageUrl } from "@/lib/destinations/destination-hero-images";
import { parseDestinationLabel } from "@/lib/search/destination-overview-instant";
import type { PlanRegionContext } from "@/lib/search/destination-build-payload";
import type { TouristRegion } from "@/lib/destinations/tourist-regions";
import {
  pickDisplayName,
  pickWhy,
  regionDisplayName,
  regionMatchesDestination,
} from "@/lib/destinations/tourist-regions";

export type DestinationStory = {
  placeName: string;
  country: string | null;
  headline: string;
  phenomenon: string;
  intro: string;
  heroImageUrl: string | null;
  regionHighlights: Array<{ name: string; teaser: string }>;
};

type StoryEntry = {
  keys: string[];
  headline_pl: string;
  headline_en: string;
  phenomenon_pl: string;
  phenomenon_en: string;
  intro_pl: string;
  intro_en: string;
};

const CURATED_STORIES: StoryEntry[] = [
  {
    keys: ["albania", "saranda", "ksamil", "vlore", "vlorë", "dhermi", "tirana"],
    headline_pl: "Albania — rywiera, o której dopiero usłyszysz",
    headline_en: "Albania — the riviera everyone will talk about next",
    phenomenon_pl:
      "Turkus wody jak na Malediwach, ceny niższe niż w Chorwacji sprzed dekady, grecko-rzymskie ruiny nad brzegiem i góry w tle. To destynacja „zanim stanie się oczywista”.",
    phenomenon_en:
      "Maldives-blue water, prices below Croatia a decade ago, Greco-Roman ruins by the coast and mountains behind. A destination before it becomes obvious.",
    intro_pl:
      "Poniżej miejsca, które realnie warto wpisać w plan — nie suche pinezki z mapy, tylko to, co podróżnicy polecają najczęściej i dlaczego.",
    intro_en:
      "Below are places worth building your trip around — not random map pins, but what travellers recommend most and why.",
  },
  {
    keys: ["sardynia", "sardinia", "olbia", "cagliari", "alghero", "costa smeralda"],
    headline_pl: "Sardynia — dzika wyspa, która nie udaje Teneryfy",
    headline_en: "Sardinia — a wild island that doesn't pretend to be Tenerife",
    phenomenon_pl:
      "Wąskie zatoki jak Cala Goloritzé, nuragowe wioski sprzed Imperium Rzymskiego, Costa Smeralda obok pustynnych wydm — wyspa większa niż cała Belgia, więc kluczem jest wybór rejonu, nie „objazd wszystkiego”.",
    phenomenon_en:
      "Coves like Cala Goloritzé, nuragic villages older than Rome, Costa Smeralda next to desert dunes — an island bigger than Belgium, so pick a region, not a checklist.",
    intro_pl:
      "Wybraliśmy miejsca, które dają poczuć charakter wyspy — morze, historia i krajobraz — z krótkim wyjaśnieniem, po co tam pojechać.",
    intro_en:
      "We picked places that capture the island — sea, history and landscape — with a short note on why each one matters.",
  },
  {
    keys: ["kreta", "crete", "heraklion", "chania", "rethymno"],
    headline_pl: "Kreta — minikontynent w jednej wyspie",
    headline_en: "Crete — a mini-continent on one island",
    phenomenon_pl:
      "Od pałacu w Knossos po samotne plaże Elafonisi, przesmyk Samarii i taverny w portach — tu można spędzić tydzień bez powtórzeń.",
    phenomenon_en:
      "From Knossos to Elafonisi pink sand, Samaria gorge and harbour tavernas — a week here never repeats.",
    intro_pl:
      "Propozycje dopasowane do typowego wyjazdu na Kretę — z opisem, co zyskasz w każdym miejscu.",
    intro_en:
      "Suggestions matched to a typical Crete trip — with what you gain at each stop.",
  },
  {
    keys: ["teneryfa", "tenerife", "lanzarote", "fuerteventura", "gran canaria", "majorka", "mallorca"],
    headline_pl: "Wyspy — słońce, krajobraz i jeden rejon na tydzień",
    headline_en: "Islands — sun, landscape and one base per week",
    phenomenon_pl:
      "Każda wyspa to inny charakter: wulkany Lanzarote, klify Teneryfy, wydmy Gran Canarii. Najlepiej wybrać 5–7 miejsc w jednym rejonie niż jechać po całej wyspie każdego dnia.",
    phenomenon_en:
      "Each island has its own character: Lanzarote volcanoes, Tenerife cliffs, Gran Canaria dunes. Better to pick 5–7 places in one area than drive the whole island daily.",
    intro_pl:
      "To miejsca, które dają „wow” bez marnowania połowy urlopu w aucie.",
    intro_en:
      "Places that deliver wow without wasting half your holiday in the car.",
  },
];

function normalizeKey(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchStory(label: string): StoryEntry | null {
  const n = normalizeKey(label);
  for (const story of CURATED_STORIES) {
    if (story.keys.some((k) => n.includes(k))) return story;
  }
  return null;
}

export function resolveDestinationStory({
  destinationLabel,
  regions,
  regionContext,
  locale = "pl",
}: {
  destinationLabel: string;
  regions: TouristRegion[];
  regionContext?: PlanRegionContext | null;
  locale?: Locale;
}): DestinationStory {
  const { place, country } = parseDestinationLabel(destinationLabel);
  const pl = locale !== "en";
  const curated = matchStory(destinationLabel) ?? matchStory(place);

  const regionHighlights = regions.slice(0, 4).map((r) => ({
    name: regionDisplayName(r, locale),
    teaser: pl ? r.overview_pl : r.overview_en,
  }));

  if (regionContext) {
    return {
      placeName: pl ? regionContext.name_pl : regionContext.name_en,
      country,
      headline: pl
        ? `${regionContext.name_pl} — co warto zobaczyć`
        : `${regionContext.name_en} — what to see`,
      phenomenon: pl ? regionContext.overview_pl : regionContext.overview_en,
      intro: pl ? regionContext.stay_hint_pl : regionContext.stay_hint_en,
      heroImageUrl: resolveCuratedHeroImageUrl(destinationLabel),
      regionHighlights,
    };
  }

  if (curated) {
    return {
      placeName: place,
      country,
      headline: pl ? curated.headline_pl : curated.headline_en,
      phenomenon: pl ? curated.phenomenon_pl : curated.phenomenon_en,
      intro: pl ? curated.intro_pl : curated.intro_en,
      heroImageUrl: resolveCuratedHeroImageUrl(destinationLabel),
      regionHighlights,
    };
  }

  if (regions.length > 0) {
    const top = regions[0]!;
    return {
      placeName: place,
      country,
      headline: pl
        ? `${place} — ${regionDisplayName(top, locale)} i okolice`
        : `${place} — ${regionDisplayName(top, locale)} and beyond`,
      phenomenon: pl ? top.overview_pl : top.overview_en,
      intro: pl
        ? "Wybierz miejsca, które chcesz zobaczyć — potem zaproponujemy bazę noclegową i trasy."
        : "Pick the places you want to see — then we'll suggest a base and routes.",
      heroImageUrl: resolveCuratedHeroImageUrl(destinationLabel),
      regionHighlights,
    };
  }

  const where = country ? `${place} (${country})` : place;
  return {
    placeName: place,
    country,
    headline: pl ? `Co zobaczyć w: ${where}` : `What to see in ${where}`,
    phenomenon: pl
      ? `${where} to destynacja, którą warto poznać przez konkretne miejsca — nie przez przypadkowe pinezki na mapie.`
      : `${where} is best discovered through specific places — not random map pins.`,
    intro: pl
      ? "Zaznacz, co Cię interesuje. Resztę planu (nocleg, dojazdy) ułożymy pod Twój wybór."
      : "Select what interests you. We'll build lodging and routes around your picks.",
    heroImageUrl: resolveCuratedHeroImageUrl(destinationLabel),
    regionHighlights: [],
  };
}

export function matchingRegionsForDestination(
  catalog: TouristRegion[],
  destinationLabel: string,
  touristRegionId?: string | null,
): TouristRegion[] {
  const matched = catalog.filter((r) =>
    regionMatchesDestination(r, destinationLabel),
  );
  if (touristRegionId) {
    const selected = matched.find((r) => r.id === touristRegionId);
    if (selected) return [selected];
  }
  return matched;
}

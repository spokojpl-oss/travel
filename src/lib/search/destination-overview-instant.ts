import { DESTINATION_CATALOG } from "@/lib/destinations/catalog";
import type { ExplorationScope } from "@/lib/search/exploration-scope";
import type { WeatherSummary } from "@/types/domain";

const HERO_IMAGES: Record<string, string> = {
  majorka:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Palma_de_Mallorca_Sunset_Harbour_Spain.jpg/1280px-Palma_de_Mallorca_Sunset_Harbour_Spain.jpg",
  mallorca:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Palma_de_Mallorca_Sunset_Harbour_Spain.jpg/1280px-Palma_de_Mallorca_Sunset_Harbour_Spain.jpg",
  kreta:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Balos_lagoon_Crete_Greece.jpg/1280px-Balos_lagoon_Crete_Greece.jpg",
  crete:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Balos_lagoon_Crete_Greece.jpg/1280px-Balos_lagoon_Crete_Greece.jpg",
  praga:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Prague_from_Petr%C5%AFin_Lookout_Tower.jpg/1280px-Prague_from_Petr%C5%AFin_Lookout_Tower.jpg",
  prague:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Prague_from_Petr%C5%AFin_Lookout_Tower.jpg/1280px-Prague_from_Petr%C5%AFin_Lookout_Tower.jpg",
  barcelona:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Barcelona_Skyline_Panorama_-_Dec_2007.jpg/1280px-Barcelona_Skyline_Panorama_-_Dec_2007.jpg",
  lizbona:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Lisbon_aerial_view.jpg/1280px-Lisbon_aerial_view.jpg",
  lisbon:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Lisbon_aerial_view.jpg/1280px-Lisbon_aerial_view.jpg",
  czechy:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Prague_07-2016_View_from_Old_Town_Hall_Tower_img3.jpg/1280px-Prague_07-2016_View_from_Old_Town_Hall_Tower_img3.jpg",
  czechia:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Prague_07-2016_View_from_Old_Town_Hall_Tower_img3.jpg/1280px-Prague_07-2016_View_from_Old_Town_Hall_Tower_img3.jpg",
};

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function parseDestinationLabel(label: string): {
  place: string;
  country: string | null;
} {
  const parts = label.split(",").map((p) => p.trim()).filter(Boolean);
  const place = parts[0] ?? label;
  const country = parts.length >= 2 ? parts[parts.length - 1] : null;
  return { place, country };
}

export function resolveHeroImageUrl(destinationLabel: string): string | null {
  const { place } = parseDestinationLabel(destinationLabel);
  const key = normalizeKey(place);
  if (HERO_IMAGES[key]) return HERO_IMAGES[key];

  const catalogHit = DESTINATION_CATALOG.find((d) => {
    const nameKey = normalizeKey(d.name);
    if (nameKey === key) return true;
    return (d.aliases ?? []).some((a) => normalizeKey(a) === key);
  });
  if (!catalogHit) return null;

  const catalogKey = normalizeKey(catalogHit.name);
  return HERO_IMAGES[catalogKey] ?? null;
}

export function buildScopeIntro(
  scope: ExplorationScope,
  place: string,
  locale: "pl" | "en" = "pl",
): string {
  if (locale === "en") {
    switch (scope) {
      case "local":
        return `You're focusing on one area of ${place} — we'll look for stays and day trips nearby.`;
      case "region":
        return `You're exploring a part of ${place} — a few towns within easy reach of one base.`;
      case "island":
        return `You want to see more of ${place} — we'll suggest a few regions to choose from.`;
      case "roadtrip":
        return `You're travelling around ${place} with flexibility — wider range, changing bases if needed.`;
    }
  }

  switch (scope) {
    case "local":
      return `Zostajecie w jednym rejonie ${place} — szukamy noclegów i wycieczek w okolicy.`;
    case "region":
      return `Zwiedzacie wybrany fragment ${place} — kilka miejscowości z jednej bazy.`;
    case "island":
      return `Chcecie poznać więcej ${place} — zaproponujemy kilka regionów do wyboru.`;
    case "roadtrip":
      return `Podróżujecie po ${place} z elastycznością — szerszy zasięg, możliwa zmiana bazy.`;
  }
}

export function buildGenericSummary(
  place: string,
  country: string | null,
  locale: "pl" | "en" = "pl",
): string {
  const where = country ? `${place} (${country})` : place;
  if (locale === "en") {
    return `${where} — a quick snapshot before you pick activities. You don't need the whole guidebook here: choose what interests you next, and we'll match areas and stays to your trip.`;
  }
  return `${where} — krótki przegląd przed wyborem atrakcji. Nie musicie znać całego regionu na pamięć: na kolejnym kroku wybierzecie, co Was interesuje, a my dopasujemy rejony i noclegi.`;
}

export type DestinationOverview = {
  destination_label: string;
  place_name: string;
  exploration_scope: ExplorationScope;
  scope_intro: string;
  summary: string;
  hero_image_url: string | null;
  weather: WeatherSummary | null;
  enriching?: boolean;
};

export function buildInstantOverview({
  destinationLabel,
  explorationScope,
  locale = "pl",
}: {
  destinationLabel: string;
  explorationScope: ExplorationScope;
  locale?: "pl" | "en";
}): DestinationOverview {
  const { place, country } = parseDestinationLabel(destinationLabel);

  return {
    destination_label: destinationLabel,
    place_name: place,
    exploration_scope: explorationScope,
    scope_intro: buildScopeIntro(explorationScope, place, locale),
    summary: buildGenericSummary(place, country, locale),
    hero_image_url: resolveHeroImageUrl(destinationLabel),
    weather: null,
    enriching: true,
  };
}

import type { Locale } from "@/i18n/config";
import type { ScoredTouristRegion } from "@/lib/destinations/tourist-regions";
import {
  regionCharacterLabel,
  regionDisplayName,
  regionVibeLabel,
} from "@/lib/destinations/tourist-regions";

const CYCLING_SLUGS = new Set([
  "cycling",
  "bike_rental",
  "ebike_rental",
  "mountain_biking",
  "hiking_trails",
  "sandy_beaches",
]);

export type CyclingRegionOverview = {
  overview: string;
  cyclingHint: string;
  infrastructure: string;
  stayHint: string;
};

function cyclingPicks(region: ScoredTouristRegion, locale: Locale): string[] {
  const picks = region.picks_for_rhythm.filter((p) =>
    p.activity_slugs.some((s) => CYCLING_SLUGS.has(s)),
  );
  if (picks.length === 0) {
    return region.picks_for_rhythm.slice(0, 2).map((p) =>
      locale === "en" ? p.name_en : p.name_pl,
    );
  }
  return picks.slice(0, 3).map((p) => (locale === "en" ? p.name_en : p.name_pl));
}

function terrainFromCharacter(
  character: ScoredTouristRegion["character"],
  locale: Locale,
): string {
  const map: Record<ScoredTouristRegion["character"], [string, string]> = {
    wild: ["Górzysty / dziki teren — licz się z przewyższeniami.", "Hilly / wild terrain — expect climbing."],
    historic: ["Mieszany teren — miasto, wzgórza i drogi lokalne.", "Mixed terrain — towns, hills, local roads."],
    resort: ["Przewaga łagodnych tras przy wybrzeżu lub w dolinach.", "Mostly gentler coastal or valley riding."],
    mixed: ["Zróżnicowany profil — od płaskich odcinków po podjazdy.", "Varied profile — flat sections and climbs."],
  };
  const pair = map[character];
  return locale === "en" ? pair[1] : pair[0];
}

function rentalHint(activitySlugs: string[], locale: Locale): string {
  const hasRental =
    activitySlugs.includes("bike_rental") ||
    activitySlugs.includes("ebike_rental");
  const hasMtb = activitySlugs.includes("mountain_biking");
  if (locale === "en") {
    if (hasRental && hasMtb) {
      return "Bike and e-bike rentals in the area; MTB infrastructure nearby.";
    }
    if (hasRental) return "Bike rentals available in the region.";
    if (hasMtb) return "MTB trails — bring your own bike or check local shops.";
    return "Few rental points in data — plan bike transport or check shops on arrival.";
  }
  if (hasRental && hasMtb) {
    return "Wypożyczalnie rowerów i e-bike w regionie; infrastruktura MTB w pobliżu.";
  }
  if (hasRental) return "Są wypożyczalnie rowerów w tym rejonie.";
  if (hasMtb) return "Trasy MTB — weź własny rower lub sprawdź lokalne sklepy.";
  return "Mało punktów wypożyczalni w danych — zaplanuj transport roweru lub sprawdź sklepy na miejscu.";
}

export function buildCyclingRegionOverview(
  region: ScoredTouristRegion,
  locale: Locale = "pl",
): CyclingRegionOverview {
  const name = regionDisplayName(region, locale);
  const picks = cyclingPicks(region, locale);
  const terrain = terrainFromCharacter(region.character, locale);
  const rental = rentalHint(region.activity_slugs, locale);
  const stayBase = locale === "en" ? region.stay_hint_en : region.stay_hint_pl;

  const beachNote =
    region.activity_slugs.includes("sandy_beaches") ||
    region.picks_for_rhythm.some((p) => p.activity_slugs.includes("sandy_beaches"))
      ? locale === "en"
        ? "Sandy beaches nearby — good for recovery rides or family beach days off the bike."
        : "Piaszczyste plaże w pobliżu — regeneracja po jeździe lub dzień na plaży."
      : "";

  let overview: string;
  if (locale === "en") {
    overview = `${name} — ${terrain} ${rental}`;
    if (picks.length > 0) {
      overview += ` Notable: ${picks.join(", ")}.`;
    }
  } else {
    overview = `${name} — ${terrain} ${rental}`;
    if (picks.length > 0) {
      overview += ` W okolicy: ${picks.join(", ")}.`;
    }
  }

  const cyclingHint = [
    regionCharacterLabel(region.character, locale),
    regionVibeLabel(region.vibe, locale),
    beachNote,
  ]
    .filter(Boolean)
    .join(" · ");

  const infrastructure = rental;

  const stayHint =
    locale === "en"
      ? `Cycling base: ${stayBase} Prefer town centre for shops and rentals, or coast if you want beach access between rides.`
      : `Baza kolarska: ${stayBase} Centrum = sklepy i wypożyczalnie; wybrzeże = plaża między przejazdami.`;

  return { overview, cyclingHint, infrastructure, stayHint };
}

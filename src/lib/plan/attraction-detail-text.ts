import type { AttractionWithActivities } from "@/types/domain";
import type { Locale } from "@/i18n/config";
import { toPolishAttractionName } from "@/lib/plan/attraction-display-name";

type OsmTags = Record<string, string>;

const WEAK_PATTERNS = [
  /^miejsce z kategorii:/i,
  /^point of interest:/i,
  /^place from category:/i,
  /^kategoria:/i,
];

const JUNK_OSM_PATTERNS = [
  /yahoo/i,
  /satellite image/i,
  /mapped from/i,
  /could be different/i,
  /exact building dimensions/i,
  /fixme/i,
  /^source:/i,
  /imported from/i,
  /approximate location/i,
  /needs survey/i,
  /not verified/i,
  /position approximate/i,
  /building=yes/i,
  /^yes$/i,
  /^no$/i,
];

export function isWeakAttractionDescription(text: string | null | undefined): boolean {
  const t = text?.trim();
  if (!t || t.length < 20) return true;
  if (WEAK_PATTERNS.some((p) => p.test(t))) return true;
  return isJunkOsmText(t);
}

export function isJunkOsmText(text: string | null | undefined): boolean {
  const t = text?.trim();
  if (!t || t.length < 12) return true;
  return JUNK_OSM_PATTERNS.some((p) => p.test(t));
}

function asOsmTags(raw: unknown): OsmTags {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: OsmTags = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value == null) continue;
    const s = String(value).trim();
    if (s) out[key] = s;
  }
  return out;
}

function pickOsmDescription(tags: OsmTags, locale: Locale): string | null {
  const keys =
    locale === "pl"
      ? ["description:pl", "description", "description:en"]
      : ["description:en", "description", "description:pl"];
  for (const key of keys) {
    const v = tags[key]?.trim();
    if (v && v.length >= 20 && !isJunkOsmText(v)) return v;
  }
  return null;
}

export function isLikelyEnglish(text: string): boolean {
  const lower = text.toLowerCase();
  const polishChars = /[ąćęłńóśźż]/;
  if (polishChars.test(lower)) return false;
  const englishHints = [
    " the ",
    " and ",
    " with ",
    " beach ",
    " popular ",
    " backed ",
    " seasonal ",
    " are ",
    " is ",
    " on the ",
    " of the ",
    " island ",
    " system ",
  ];
  const polishHints = [" plaż", " zatok", " nad ", " oraz ", " morze", " piaszcz", " jaskin", " wysp"];
  let en = 0;
  let pl = 0;
  for (const h of englishHints) if (lower.includes(h)) en++;
  for (const h of polishHints) if (lower.includes(h)) pl++;
  return en > pl;
}

function formatFeeValue(fee: string, pl: boolean): string {
  const v = fee.trim().toLowerCase();
  if (v === "yes") return pl ? "płatne" : "paid";
  if (v === "no") return pl ? "bezpłatne" : "free";
  return fee.trim();
}

function localizeOpeningHours(hours: string, pl: boolean): string {
  if (!pl) return hours.trim();
  return hours
    .trim()
    .replace(/\bMo\b/g, "Pn")
    .replace(/\bTu\b/g, "Wt")
    .replace(/\bWe\b/g, "Śr")
    .replace(/\bTh\b/g, "Cz")
    .replace(/\bFr\b/g, "Pt")
    .replace(/\bSa\b/g, "So")
    .replace(/\bSu\b/g, "Nd");
}

export function attractionNameSearchVariants(
  name: string,
  locale: Locale = "pl",
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  function add(raw: string) {
    const t = raw.trim().replace(/\s+/g, " ");
    if (t.length < 3 || seen.has(t.toLowerCase())) return;
    seen.add(t.toLowerCase());
    out.push(t);
  }

  add(name);
  if (locale !== "en") {
    add(toPolishAttractionName(name, "pl"));
  }
  for (const part of name.split(/[;|/]/)) {
    add(part);
  }

  const withoutHotel = name.replace(/\b(hotel|motel|guesthouse|resort)\b/gi, "").trim();
  if (withoutHotel.length >= 4) add(withoutHotel);

  return out.slice(0, 6);
}

function usefulHighlights(
  tags: OsmTags,
  attraction: AttractionWithActivities,
  locale: Locale,
): string[] {
  const pl = locale !== "en";
  const lines: string[] = [];

  if (tags.heritage?.trim() && !/^yes$/i.test(tags.heritage)) {
    lines.push(
      pl
        ? `Wpisanie / dziedzictwo: ${tags.heritage}.`
        : `Heritage: ${tags.heritage}.`,
    );
  }

  if (tags.start_date?.trim() && tags.start_date.length >= 3) {
    lines.push(pl ? `Datowanie: od ${tags.start_date}.` : `Dating: from ${tags.start_date}.`);
  }

  if (tags.fee?.trim() && tags.fee !== "no") {
    lines.push(
      pl
        ? `Opłata: ${formatFeeValue(tags.fee, true)}.`
        : `Fee: ${formatFeeValue(tags.fee, false)}.`,
    );
  }

  if (tags.access?.trim() && !/^(yes|public)$/i.test(tags.access)) {
    lines.push(pl ? `Dostęp: ${tags.access}.` : `Access: ${tags.access}.`);
  }

  const rating = tags.rating?.trim();
  const ratingCount = tags.rating_count?.trim();
  if (rating && Number(rating) >= 4 && ratingCount && Number(ratingCount) >= 20) {
    lines.push(
      pl
        ? `Google ${rating}/5 (${ratingCount} opinii).`
        : `Google ${rating}/5 (${ratingCount} reviews).`,
    );
  }

  if (attraction.opening_hours?.trim() && attraction.opening_hours.length < 120) {
    const hours = localizeOpeningHours(attraction.opening_hours, pl);
    lines.push(pl ? `Godziny: ${hours}` : `Hours: ${hours}`);
  }

  return lines.slice(0, 3);
}

export function buildInlineAttractionDetail(
  attraction: AttractionWithActivities,
  locale: Locale,
): { overview: string | null; highlights: string[] } {
  const tags = asOsmTags(attraction.tags);

  const dbDesc = attraction.description?.trim();
  if (dbDesc && !isWeakAttractionDescription(dbDesc)) {
    return {
      overview: dbDesc,
      highlights: usefulHighlights(tags, attraction, locale),
    };
  }

  const osmDesc = pickOsmDescription(tags, locale);
  if (osmDesc) {
    return {
      overview: osmDesc,
      highlights: usefulHighlights(tags, attraction, locale),
    };
  }

  return {
    overview: null,
    highlights: usefulHighlights(tags, attraction, locale),
  };
}

export function wikipediaTargetFromOsmTags(
  tags: OsmTags,
  locale: Locale,
): { page: string; wikiLocale: Locale } | null {
  const raw = tags.wikipedia?.trim();
  if (!raw) return null;

  const colon = raw.indexOf(":");
  if (colon > 0) {
    const lang = raw.slice(0, colon).toLowerCase();
    const page = raw.slice(colon + 1).trim();
    if (page && (lang === "pl" || lang === "en")) {
      return { page, wikiLocale: lang as Locale };
    }
  }
  return { page: raw, wikiLocale: locale };
}

export function wikipediaSearchTitle(name: string): string {
  return name.trim().replace(/\s+/g, "_");
}

export function wikipediaSearchUrl(name: string, locale: Locale): string {
  const host = locale === "pl" ? "pl.wikipedia.org" : "en.wikipedia.org";
  return `https://${host}/w/index.php?search=${encodeURIComponent(name)}`;
}

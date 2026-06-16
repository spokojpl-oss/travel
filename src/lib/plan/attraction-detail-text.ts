import type { AttractionWithActivities } from "@/types/domain";
import type { Locale } from "@/i18n/config";

type OsmTags = Record<string, string>;

const WEAK_PATTERNS = [
  /^miejsce z kategorii:/i,
  /^point of interest:/i,
  /^place from category:/i,
  /^kategoria:/i,
];

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

export function isWeakAttractionDescription(text: string | null | undefined): boolean {
  const t = text?.trim();
  if (!t || t.length < 20) return true;
  return WEAK_PATTERNS.some((p) => p.test(t));
}

function pickOsmDescription(tags: OsmTags, locale: Locale): string | null {
  const keys =
    locale === "pl"
      ? ["description:pl", "description", "note:pl", "note", "description:en"]
      : ["description:en", "description", "note", "description:pl"];
  for (const key of keys) {
    const v = tags[key]?.trim();
    if (v && v.length >= 12) return v;
  }
  return null;
}

function labelHistoric(value: string, locale: Locale): string | null {
  const v = value.toLowerCase();
  const pl = locale !== "en";
  if (v === "ruins" || v === "ruin") {
    return pl ? "ruiny (resztki murów lub zabudowy)" : "ruins (remains of walls or structures)";
  }
  if (v === "castle") return pl ? "zamek lub fortyfikacja" : "castle or fortification";
  if (v === "archaeological_site") {
    return pl ? "stanowisko archeologiczne" : "archaeological site";
  }
  if (v === "fort") return pl ? "fort" : "fort";
  if (v === "city_gate") return pl ? "brama miejska" : "city gate";
  if (v === "citywalls") return pl ? "mury miejskie" : "city walls";
  if (v === "monument") return pl ? "pomnik" : "monument";
  if (v === "memorial") return pl ? "memoriał" : "memorial";
  return null;
}

function buildHighlightsFromTags(
  tags: OsmTags,
  attraction: AttractionWithActivities,
  locale: Locale,
): string[] {
  const pl = locale !== "en";
  const lines: string[] = [];

  const historic = tags.historic?.trim();
  if (historic) {
    const label = labelHistoric(historic, locale);
    if (label) lines.push(pl ? `Charakter: ${label}.` : `Type: ${label}.`);
  }

  if (tags.ruins === "yes") {
    lines.push(
      pl
        ? "To raczej ruiny niż pełnowymiarowa atrakcja z wystawą."
        : "Mostly ruins rather than a full visitor attraction.",
    );
  }

  const castleType = tags.castle_type?.trim();
  if (castleType) {
    lines.push(pl ? `Typ obiektu: ${castleType.replaceAll("_", " ")}.` : `Structure: ${castleType.replaceAll("_", " ")}.`);
  }

  if (tags.heritage?.trim()) {
    lines.push(
      pl
        ? `Obiekt dziedzictwa (${tags.heritage}).`
        : `Heritage site (${tags.heritage}).`,
    );
  }

  if (tags.start_date?.trim()) {
    lines.push(pl ? `Datowanie: od ${tags.start_date}.` : `Dating: from ${tags.start_date}.`);
  }

  if (tags.tourism?.trim() && tags.tourism !== "attraction") {
    lines.push(pl ? `Turystyka: ${tags.tourism}.` : `Tourism: ${tags.tourism}.`);
  }

  if (tags.natural === "beach") {
    const surface = tags.surface?.trim();
    if (surface) {
      lines.push(pl ? `Nawierzchnia: ${surface}.` : `Surface: ${surface}.`);
    }
  }

  if (tags.access?.trim() && tags.access !== "yes") {
    lines.push(pl ? `Dostęp: ${tags.access}.` : `Access: ${tags.access}.`);
  }

  if (tags.fee?.trim() && tags.fee !== "no") {
    lines.push(pl ? `Opłata: ${tags.fee}.` : `Fee: ${tags.fee}.`);
  }

  const rating = tags.rating?.trim();
  const ratingCount = tags.rating_count?.trim();
  if (rating && Number(rating) >= 3.5) {
    lines.push(
      pl
        ? `Ocena Google: ${rating}${ratingCount ? ` (${ratingCount} opinii)` : ""}.`
        : `Google rating: ${rating}${ratingCount ? ` (${ratingCount} reviews)` : ""}.`,
    );
  }

  if (attraction.opening_hours?.trim()) {
    lines.push(
      pl
        ? `Godziny: ${attraction.opening_hours.trim()}`
        : `Hours: ${attraction.opening_hours.trim()}`,
    );
  }

  return lines.slice(0, 4);
}

/** Tekst z bazy + tagów OSM — bez Wikipedii. */
export function buildInlineAttractionDetail(
  attraction: AttractionWithActivities,
  locale: Locale,
): { overview: string | null; highlights: string[] } {
  const tags = asOsmTags(attraction.tags);
  const highlights = buildHighlightsFromTags(tags, attraction, locale);

  const dbDesc = attraction.description?.trim();
  if (dbDesc && !isWeakAttractionDescription(dbDesc)) {
    return { overview: dbDesc, highlights };
  }

  const osmDesc = pickOsmDescription(tags, locale);
  if (osmDesc) {
    return { overview: osmDesc, highlights };
  }

  if (highlights.length > 0) {
    const pl = locale !== "en";
    return {
      overview: pl
        ? "Szczegółowy opis jeszcze nie jest w bazie — poniżej to, co wiemy z mapy."
        : "No full write-up yet — here's what we know from the map data.",
      highlights,
    };
  }

  return { overview: null, highlights: [] };
}

export function wikipediaTargetFromOsmTags(
  tags: OsmTags,
  locale: Locale,
): { page: string; wikiLocale: Locale } | null {
  const raw = tags.wikipedia?.trim();
  if (raw) {
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

  return null;
}

export function wikipediaSearchTitle(name: string): string {
  return name.trim().replace(/\s+/g, "_");
}

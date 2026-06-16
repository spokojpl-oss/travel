import { apiEnv } from "@/config/api-env";
import { searchPlacesByText } from "@/lib/api/google-places";
import { fetchWikipediaPageSummary } from "@/lib/api/wikipedia-summary";
import { distanceKm } from "@/lib/search/geo-clustering";
import {
  attractionNameSearchVariants,
  buildInlineAttractionDetail,
  isWeakAttractionDescription,
  wikipediaSearchTitle,
  wikipediaTargetFromOsmTags,
} from "@/lib/plan/attraction-detail-text";
import type { AttractionWithActivities } from "@/types/domain";
import type { BoundingBox } from "@/types/domain";
import type { Locale } from "@/i18n/config";

export type AttractionDetailResult = {
  overview: string | null;
  highlights: string[];
  source: "curated" | "db" | "osm" | "wikipedia" | "google" | "none";
  wikipediaUrl?: string;
};

function bboxAround(lat: number, lon: number, delta = 0.04): BoundingBox {
  return {
    north: lat + delta,
    south: lat - delta,
    east: lon + delta,
    west: lon - delta,
  };
}

function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function namesLikelyMatch(a: string, b: string): boolean {
  const na = normalizeForMatch(a);
  const nb = normalizeForMatch(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wordsA = na.split(" ").filter((w) => w.length > 3);
  const wordsB = new Set(nb.split(" ").filter((w) => w.length > 3));
  const overlap = wordsA.filter((w) => wordsB.has(w)).length;
  return overlap >= 2 || (wordsA.length === 1 && wordsB.has(wordsA[0]!));
}

async function fetchGoogleEditorialSummary(
  name: string,
  lat: number,
  lon: number,
): Promise<string | null> {
  if (!apiEnv.GOOGLE_PLACES_API_KEY) return null;

  const bbox = bboxAround(lat, lon);
  const variants = attractionNameSearchVariants(name);

  for (const query of variants.slice(0, 3)) {
    try {
      const places = await searchPlacesByText({ textQuery: query, bbox });
      const match = places
        .filter((p) => p.location && p.editorial_summary?.trim())
        .map((p) => ({
          p,
          dist: distanceKm({ lat, lon }, p.location!),
          nameOk: namesLikelyMatch(name, p.name),
        }))
        .filter((x) => x.dist <= 1.2 && x.nameOk)
        .sort((a, b) => a.dist - b.dist)[0];

      if (match?.p.editorial_summary) {
        return match.p.editorial_summary.trim();
      }
    } catch {
      /* brak klucza / limit — pomiń */
    }
  }

  return null;
}

async function fetchWikipediaOverview(
  attraction: AttractionWithActivities,
  tags: Record<string, string>,
  locale: Locale,
): Promise<{ overview: string; wikipediaUrl?: string } | null> {
  const wikiFromTag = wikipediaTargetFromOsmTags(tags, locale);
  const candidates: Array<{ page: string; wikiLocale: Locale }> = [];

  if (wikiFromTag) candidates.push(wikiFromTag);

  for (const variant of attractionNameSearchVariants(attraction.name)) {
    candidates.push({ page: wikipediaSearchTitle(variant), wikiLocale: locale });
    if (locale === "pl") {
      candidates.push({ page: wikipediaSearchTitle(variant), wikiLocale: "en" });
    }
  }

  const seen = new Set<string>();
  for (const candidate of candidates) {
    const key = `${candidate.wikiLocale}:${candidate.page}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const wiki = await fetchWikipediaPageSummary(
      candidate.page,
      candidate.wikiLocale,
      4000,
    );
    if (wiki?.extract && !isWeakAttractionDescription(wiki.extract)) {
      return {
        overview: wiki.extract,
        wikipediaUrl: `https://${candidate.wikiLocale === "pl" ? "pl" : "en"}.wikipedia.org/wiki/${encodeURIComponent(candidate.page)}`,
      };
    }
  }

  return null;
}

export async function resolveAttractionDetail(
  attraction: AttractionWithActivities,
  locale: Locale,
): Promise<AttractionDetailResult> {
  const inline = buildInlineAttractionDetail(attraction, locale);
  if (inline.overview && !isWeakAttractionDescription(inline.overview)) {
    return {
      overview: inline.overview,
      highlights: inline.highlights,
      source:
        attraction.source === "curated"
          ? "curated"
          : inline.overview === attraction.description?.trim()
            ? "db"
            : "osm",
    };
  }

  const tags =
    attraction.tags && typeof attraction.tags === "object" && !Array.isArray(attraction.tags)
      ? (Object.fromEntries(
          Object.entries(attraction.tags as Record<string, unknown>).map(([k, v]) => [
            k,
            String(v ?? ""),
          ]),
        ) as Record<string, string>)
      : {};

  const wiki = await fetchWikipediaOverview(attraction, tags, locale);
  if (wiki) {
    return {
      overview: wiki.overview,
      highlights: inline.highlights,
      source: "wikipedia",
      wikipediaUrl: wiki.wikipediaUrl,
    };
  }

  const googleSummary = await fetchGoogleEditorialSummary(
    attraction.name,
    Number(attraction.lat),
    Number(attraction.lon),
  );
  if (googleSummary && !isWeakAttractionDescription(googleSummary)) {
    return {
      overview: googleSummary,
      highlights: inline.highlights,
      source: "google",
    };
  }

  return {
    overview: null,
    highlights: [],
    source: "none",
  };
}

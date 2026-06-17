import type { ActivityRoute } from "@/types/activities";

export type KomootLocale = "pl" | "en";

export type KomootRouteAction =
  | {
      kind: "tour";
      url: string;
      tourId: string;
    }
  | {
      kind: "import";
      importUrl: string;
      gpxUrl: string;
      hint: "download_then_import";
    };

const CYCLING_SPORTS = new Set([
  "racebike",
  "e_racebike",
  "mtb_easy",
  "e_mtb_easy",
  "mtb",
  "e_mtb",
  "mtb_advanced",
  "e_mtb_advanced",
  "downhillbike",
  "touringbicycle",
  "e_touringbicycle",
  "citybike",
]);

export function isKomootCyclingSport(sport: string): boolean {
  return CYCLING_SPORTS.has(sport);
}

export function komootWebLocale(locale: KomootLocale): string {
  return locale === "pl" ? "pl-pl" : "en";
}

export function komootImportUrl(locale: KomootLocale = "pl"): string {
  const prefix = locale === "pl" ? "https://www.komoot.com/pl-pl" : "https://www.komoot.com";
  return `${prefix}/upload`;
}

export function parseKomootTourId(route: ActivityRoute): string | null {
  const ext = route.source_external_id?.trim();
  if (ext) {
    const fromExt =
      ext.match(/^komoot:(?:tour|smarttour)\/(\d+)$/i)?.[1] ??
      ext.match(/^komoot:(\d+)$/i)?.[1];
    if (fromExt) return fromExt;
  }

  const external = route.external_url?.trim();
  if (external) {
    const fromUrl =
      external.match(/komoot\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?tour\/(\d+)/i)?.[1] ??
      external.match(/komoot\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?smarttour\/e(\d+)/i)?.[1];
    if (fromUrl) return fromUrl;
  }

  if (route.source === "komoot" && ext) {
    const digits = ext.replace(/\D/g, "");
    if (digits.length >= 5) return digits;
  }

  return null;
}

export function komootTourUrl(
  tourId: string,
  locale: KomootLocale = "pl",
): string {
  const prefix =
    locale === "pl"
      ? "https://www.komoot.com/pl-pl"
      : "https://www.komoot.com";
  return `${prefix}/tour/${tourId}`;
}

export function routeGpxApiUrl(routeId: string): string {
  return `/api/activities/cycling/routes/${routeId}/gpx`;
}

export function cyclingRouteKomootAction(
  route: ActivityRoute,
  locale: KomootLocale = "pl",
): KomootRouteAction {
  const tourId = parseKomootTourId(route);
  if (tourId) {
    return {
      kind: "tour",
      url: komootTourUrl(tourId, locale),
      tourId,
    };
  }

  return {
    kind: "import",
    importUrl: komootImportUrl(locale),
    gpxUrl: routeGpxApiUrl(route.id),
    hint: "download_then_import",
  };
}

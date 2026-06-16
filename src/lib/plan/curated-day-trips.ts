import { distanceKm } from "@/lib/search/geo-clustering";
import {
  SEED_TOURIST_REGIONS,
  regionMatchesDestination,
  type TouristRegion,
} from "@/lib/destinations/tourist-regions";
import { driveMinutesFromKm } from "@/lib/plan/day-trip-radius";
import { withPlanMeta, readPlanMeta } from "@/lib/plan/plan-attraction-meta";
import type { AttractionWithActivities, GeoPoint } from "@/types/domain";
import type { Locale } from "@/i18n/config";

function syntheticId(regionId: string, pickIndex: number): string {
  return `curated:${regionId}:${pickIndex}`;
}

function pickName(
  pick: TouristRegion["picks"][number],
  locale: Locale,
): string {
  return locale === "en" ? pick.name_en : pick.name_pl;
}

/** Kuracja z innych regionów tej samej destynacji — wycieczki dojazdowe (Ksamil z Vlorë itd.). */
export function buildCuratedDayTrips({
  basePoint,
  destinationLabel,
  currentRegionId,
  maxRadiusKm,
  minDistanceKm = 25,
  locale = "pl",
  catalog = SEED_TOURIST_REGIONS,
}: {
  basePoint: GeoPoint;
  destinationLabel: string;
  currentRegionId?: string | null;
  maxRadiusKm: number;
  minDistanceKm?: number;
  locale?: Locale;
  catalog?: TouristRegion[];
}): AttractionWithActivities[] {
  const matchingRegions = catalog.filter((r) =>
    regionMatchesDestination(r, destinationLabel),
  );

  const out: AttractionWithActivities[] = [];
  const seenNames = new Set<string>();

  for (const region of matchingRegions) {
    const regionPoint: GeoPoint = {
      lat: region.center_lat,
      lon: region.center_lon,
    };
    const distKm = distanceKm(basePoint, regionPoint);

    const isOtherRegion = region.id !== currentRegionId;
    const isFarEnough = distKm >= minDistanceKm;
    const withinRange = distKm <= maxRadiusKm;

    if (!withinRange) continue;
    if (!isOtherRegion && distKm < minDistanceKm) continue;
    if (isOtherRegion && !isFarEnough) continue;

    const sortedPicks = [...region.picks].sort((a, b) => a.rank - b.rank);
    const topPicks = sortedPicks.slice(0, isOtherRegion ? 2 : 1);

    for (let i = 0; i < topPicks.length; i++) {
      const pick = topPicks[i]!;
      const name = pickName(pick, locale);
      const key = name.toLowerCase();
      if (seenNames.has(key)) continue;
      seenNames.add(key);

      const driveKm = Math.round(distKm * 10) / 10;
      const driveMin = driveMinutesFromKm(distKm);

      out.push(
        withPlanMeta(
          {
            id: syntheticId(region.id, i),
            name,
            description: locale === "en" ? pick.why_en : pick.why_pl,
            category: pick.day_theme,
            subcategories: pick.activity_slugs,
            lat: regionPoint.lat,
            lon: regionPoint.lon,
            address: null,
            phone: null,
            website: null,
            opening_hours: null,
            tags: { curated_region: region.slug },
            min_age: null,
            duration_minutes: null,
            destination_id: null,
            source: "curated",
            external_id: region.slug,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            activity_tags: pick.activity_slugs.map((slug) => ({
              activity_slug: slug,
              confidence: 1,
            })),
          },
          {
            kind: "day_trip",
            drive_km: driveKm,
            drive_minutes: driveMin,
            curated: true,
            source_region_id: region.id,
          },
        ),
      );
    }
  }

  return out.sort(
    (a, b) =>
      (readPlanMeta(a)?.drive_km ?? 0) - (readPlanMeta(b)?.drive_km ?? 0),
  );
}

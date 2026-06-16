import { distanceKm } from "@/lib/search/geo-clustering";
import { isBeachAttraction } from "@/lib/plan/attraction-grouping";
import {
  isDayTripAttraction,
  readPlanMeta,
} from "@/lib/plan/plan-attraction-meta";
import type { AttractionWithActivities, GeoPoint } from "@/types/domain";

function point(a: AttractionWithActivities): GeoPoint {
  return { lat: Number(a.lat), lon: Number(a.lon) };
}

function primarySlug(a: AttractionWithActivities): string {
  return a.activity_tags[0]?.activity_slug ?? a.category ?? "other";
}

/** Domyślny wybór: mix typów + wycieczki dojazdowe + max 1 grupa plaż. */
export function selectDiverseAttractionIds(
  pool: AttractionWithActivities[],
  basePoint: GeoPoint,
  maxCount = 8,
): string[] {
  const dayTrips = pool
    .filter(isDayTripAttraction)
    .sort(
      (a, b) =>
        (readPlanMeta(a)?.drive_km ?? 999) - (readPlanMeta(b)?.drive_km ?? 999),
    );

  const nearby = pool
    .filter((a) => !isDayTripAttraction(a))
    .sort(
      (a, b) => distanceKm(basePoint, point(a)) - distanceKm(basePoint, point(b)),
    );

  const selected: AttractionWithActivities[] = [];
  const usedSlugs = new Set<string>();
  let beachCount = 0;

  const tryAdd = (a: AttractionWithActivities) => {
    if (selected.length >= maxCount) return;
    if (selected.some((s) => s.id === a.id)) return;
    const slug = primarySlug(a);
    if (isBeachAttraction(a)) {
      if (beachCount >= 1 && !readPlanMeta(a)?.group_size) return;
      beachCount += 1;
    } else if (usedSlugs.has(slug) && !isDayTripAttraction(a)) {
      return;
    }
    usedSlugs.add(slug);
    selected.push(a);
  };

  for (const dt of dayTrips.slice(0, Math.min(3, Math.ceil(maxCount / 3)))) {
    tryAdd(dt);
  }

  for (const a of nearby) {
    if (selected.length >= maxCount) break;
    tryAdd(a);
  }

  if (selected.length < maxCount) {
    for (const a of pool) {
      if (selected.length >= maxCount) break;
      tryAdd(a);
    }
  }

  return selected.map((a) => a.id);
}

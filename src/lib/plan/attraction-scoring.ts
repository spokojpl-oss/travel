import { distanceKm } from "@/lib/search/geo-clustering";
import type { AttractionWithActivities, GeoPoint } from "@/types/domain";

function point(a: AttractionWithActivities): GeoPoint {
  return { lat: Number(a.lat), lon: Number(a.lon) };
}

/** Wyższy = lepszy kandydat do zachowania w poolu. */
export function attractionScore(
  a: AttractionWithActivities,
  basePoint?: GeoPoint,
  preferredActivities?: string[],
): number {
  let score = 0;

  const maxConfidence = a.activity_tags.reduce(
    (max, t) => Math.max(max, t.confidence ?? 0),
    0,
  );
  score += maxConfidence * 10;
  score += Math.min(a.activity_tags.length, 5);

  if (preferredActivities?.length) {
    for (const tag of a.activity_tags) {
      if (preferredActivities.includes(tag.activity_slug)) {
        score += 8 * (tag.confidence ?? 0.5);
      }
    }
  }

  if (basePoint) {
    const km = distanceKm(basePoint, point(a));
    score += Math.max(0, 40 - km);
  }

  if (a.source === "curated") score -= 2;

  return score;
}

export function compareByScore(
  a: AttractionWithActivities,
  b: AttractionWithActivities,
  basePoint?: GeoPoint,
  preferredActivities?: string[],
): number {
  return (
    attractionScore(b, basePoint, preferredActivities) -
    attractionScore(a, basePoint, preferredActivities)
  );
}

import { parseRouteStartPoint } from "@/lib/supabase/activity-routes";
import type { ActivityRoute } from "@/types/activities";

export function cyclingRouteOsmUrl(route: ActivityRoute): string | null {
  const ext = route.source_external_id;
  if (!ext?.startsWith("osm:relation/")) return null;
  const id = ext.replace("osm:relation/", "");
  return `https://www.openstreetmap.org/relation/${id}`;
}

export function cyclingRouteMapsUrl(
  route: ActivityRoute,
  locale: "pl" | "en" = "pl",
): string | null {
  const start = parseRouteStartPoint(route.start_point);
  if (!start) return null;
  const ll = `${start.lat},${start.lng}`;
  const lang = locale === "pl" ? "pl" : "en";
  return `https://www.google.com/maps/search/?api=1&query=${ll}&hl=${lang}`;
}

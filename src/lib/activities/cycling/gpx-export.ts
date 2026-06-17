import { parseRouteGeometry } from "@/lib/supabase/activity-routes";
import type { ActivityRoute } from "@/types/activities";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sanitizeFilename(name: string): string {
  return name
    .trim()
    .replace(/[^\w\s-ąćęłńóśźżĄĆĘŁŃÓŚŹŻ.-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "trasa-rowerowa";
}

export function routeGpxFilename(route: ActivityRoute): string {
  return `${sanitizeFilename(route.name)}.gpx`;
}

export function buildRouteGpx(route: ActivityRoute): string | null {
  const path = parseRouteGeometry(route.geometry);
  if (path.length < 2) return null;

  const elevByKm = new Map<number, number>();
  for (const point of route.elevation_profile ?? []) {
    elevByKm.set(Math.round(point.km * 1000) / 1000, point.elev_m);
  }

  const totalKm = route.distance_m / 1000;
  const startTime = new Date().toISOString();

  const trackPoints = path
    .map((point, index) => {
      const km =
        path.length <= 1
          ? 0
          : (index / (path.length - 1)) * totalKm;
      const elev =
        elevByKm.get(Math.round(km * 1000) / 1000) ??
        elevByKm.get(Math.round(km * 10) / 10);
      const elevXml =
        elev != null && Number.isFinite(elev)
          ? `\n        <ele>${Math.round(elev)}</ele>`
          : "";
      return `      <trkpt lat="${point.lat.toFixed(6)}" lon="${point.lng.toFixed(6)}">${elevXml}
        <time>${startTime}</time>
      </trkpt>`;
    })
    .join("\n");

  const desc = route.description?.trim();

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="travel-app" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(route.name)}</name>${desc ? `\n    <desc>${escapeXml(desc)}</desc>` : ""}
    <time>${startTime}</time>
  </metadata>
  <trk>
    <name>${escapeXml(route.name)}</name>
    <type>${escapeXml(route.activity_type.replace("cycling_", ""))}</type>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`;
}

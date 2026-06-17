import type { Database } from "./database";

export type ActivityCategory = Database["public"]["Enums"]["activity_category"];
export type ActivityType = Database["public"]["Enums"]["activity_type"];
export type ActivityDifficulty = Database["public"]["Enums"]["activity_difficulty"];
export type ActivityRouteSource = Database["public"]["Enums"]["activity_route_source"];

export type ActivityRouteRow = Database["public"]["Tables"]["activity_routes"]["Row"];

export interface SurfaceMix {
  asphalt?: number;
  gravel?: number;
  dirt?: number;
  paved?: number;
  rock?: number;
}

export interface ElevationPoint {
  km: number;
  elev_m: number;
}

export interface ActivityRoute extends Omit<
  ActivityRouteRow,
  "surface_mix" | "elevation_profile" | "highlights"
> {
  surface_mix: SurfaceMix | null;
  elevation_profile: ElevationPoint[] | null;
  highlights: Array<{ name: string; lat: number; lng: number; type: string }> | null;
}

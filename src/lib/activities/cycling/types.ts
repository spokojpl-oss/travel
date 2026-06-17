import type { ActivityType } from "@/types/activities";

export interface CyclingRouteFilters {
  activityType?: ActivityType;
  minDistanceM?: number;
  maxDistanceM?: number;
  maxElevationGain?: number;
  difficulty?: Array<"easy" | "moderate" | "hard" | "expert">;
}

export interface GenerateCyclingRouteInput {
  destinationId: string;
  startLat: number;
  startLng: number;
  targetDistanceKm: number;
  activityType: ActivityType;
  loop: boolean;
}

export type CyclingRegionCenter = {
  id?: string;
  lat: number;
  lng: number;
  radiusKm?: number;
  label?: string;
};

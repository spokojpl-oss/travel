import type { ComponentType } from "react";
import type { ActivityCategory } from "@/types/activities";
import { CyclingFilters } from "@/components/activities/cycling/CyclingFilters";
import { CyclingRoutesList } from "@/components/activities/cycling/CyclingRoutesList";
import { CyclingMapLayer } from "@/components/activities/cycling/CyclingMapLayer";

export interface ActivityComponentProps {
  destinationId: string;
}

export interface ActivityMapLayerProps {
  map: google.maps.Map | null;
  selectedRouteId: string | null;
  onRouteSelect: (id: string) => void;
  showCyclOsm?: boolean;
  routes?: Array<{ id: string; path: Array<{ lat: number; lng: number }> }>;
}

export interface ActivityModuleDefinition {
  category: ActivityCategory;
  label: string;
  enabled: boolean;
  Filters: ComponentType<ActivityComponentProps>;
  RoutesList: ComponentType<ActivityComponentProps>;
  MapLayer: ComponentType<ActivityMapLayerProps>;
}

export const ACTIVITY_REGISTRY: Partial<
  Record<ActivityCategory, ActivityModuleDefinition>
> = {
  cycling: {
    category: "cycling",
    label: "Kolarstwo",
    enabled: true,
    Filters: CyclingFilters,
    RoutesList: CyclingRoutesList,
    MapLayer: CyclingMapLayer,
  },
};

export function getActivityModule(category: string | undefined) {
  if (!category) return null;
  return ACTIVITY_REGISTRY[category as ActivityCategory] ?? null;
}

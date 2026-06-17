"use client";

import { getActivityModule } from "@/lib/activities/registry";
import { CyclingActivityProvider } from "@/components/activities/cycling/CyclingActivityContext";
import type { CyclingRegionCenter } from "@/lib/activities/cycling/types";
import type { ActivityRoute } from "@/types/activities";
import type { AttractionWithActivities } from "@/types/domain";

interface Props {
  activity?: string;
  destinationId: string;
  destinationCenter?: { lat: number; lng: number } | null;
  destinationLabel?: string;
  regionCenter?: { lat: number; lng: number } | null;
  regionCenters?: CyclingRegionCenter[];
  beachAttractions?: AttractionWithActivities[];
  regionRadiusKm?: number;
  defaultShowCyclOsm?: boolean;
  planRouteIds?: Set<string>;
  onTogglePlanRoute?: (route: ActivityRoute) => void;
}

export function ActivityPanel({
  activity,
  destinationId,
  destinationLabel,
  destinationCenter,
  regionCenter,
  regionCenters,
  beachAttractions,
  regionRadiusKm,
  defaultShowCyclOsm = false,
  planRouteIds,
  onTogglePlanRoute,
}: Props) {
  const mod = getActivityModule(activity);
  if (!mod) return null;

  const { Filters, RoutesList } = mod;

  const content = (
    <section aria-label={`Trasy: ${mod.label}`} className="flex flex-col gap-4">
      <Filters destinationId={destinationId} />
      <RoutesList destinationId={destinationId} />
    </section>
  );

  if (mod.category === "cycling") {
    return (
      <CyclingActivityProvider
        destinationId={destinationId}
        destinationLabel={destinationLabel}
        destinationCenter={destinationCenter}
        regionCenter={regionCenter}
        regionCenters={regionCenters}
        beachAttractions={beachAttractions}
        regionRadiusKm={regionRadiusKm}
        defaultShowCyclOsm={defaultShowCyclOsm}
        planRouteIds={planRouteIds}
        onTogglePlanRoute={onTogglePlanRoute}
      >
        {content}
      </CyclingActivityProvider>
    );
  }

  return content;
}

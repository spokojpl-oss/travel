"use client";

import { getActivityModule } from "@/lib/activities/registry";
import { CyclingActivityProvider } from "@/components/activities/cycling/CyclingActivityContext";
import type { ActivityRoute } from "@/types/activities";

interface Props {
  activity?: string;
  destinationId: string;
  destinationCenter?: { lat: number; lng: number } | null;
  defaultShowCyclOsm?: boolean;
  planRouteIds?: Set<string>;
  onTogglePlanRoute?: (route: ActivityRoute) => void;
}

export function ActivityPanel({
  activity,
  destinationId,
  destinationCenter,
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
        destinationCenter={destinationCenter}
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

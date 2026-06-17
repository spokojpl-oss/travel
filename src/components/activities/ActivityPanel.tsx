"use client";

import { getActivityModule } from "@/lib/activities/registry";
import { CyclingActivityProvider } from "@/components/activities/cycling/CyclingActivityContext";

interface Props {
  activity?: string;
  destinationId: string;
  destinationCenter?: { lat: number; lng: number } | null;
}

export function ActivityPanel({
  activity,
  destinationId,
  destinationCenter,
}: Props) {
  const mod = getActivityModule(activity);
  if (!mod) return null;

  const { Filters, RoutesList } = mod;

  const content = (
    <section
      aria-label={`Trasy: ${mod.label}`}
      className="grid gap-4 lg:grid-cols-[280px_1fr]"
    >
      <Filters destinationId={destinationId} />
      <RoutesList destinationId={destinationId} />
    </section>
  );

  if (mod.category === "cycling") {
    return (
      <CyclingActivityProvider
        destinationId={destinationId}
        destinationCenter={destinationCenter}
      >
        {content}
      </CyclingActivityProvider>
    );
  }

  return content;
}

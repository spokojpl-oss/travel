"use client";

import { useEffect, useState } from "react";
import { ActivityPanel } from "@/components/activities/ActivityPanel";
import { SkeletonList } from "@/components/ui/Skeleton";
import { useT } from "@/i18n/locale-provider";
import type { ActivityRoute } from "@/types/activities";
import { DEFAULT_REGION_RADIUS_KM } from "@/lib/activities/cycling/generate-batch";

export function CyclingSearchPanel({
  destinationLabel,
  destinationLat,
  destinationLon,
  regionCenter,
  regionRadiusKm = DEFAULT_REGION_RADIUS_KM,
  planRouteIds,
  onTogglePlanRoute,
}: {
  destinationLabel: string;
  destinationLat?: number | null;
  destinationLon?: number | null;
  regionCenter?: { lat: number; lng: number } | null;
  regionRadiusKm?: number;
  planRouteIds?: Set<string>;
  onTogglePlanRoute?: (route: ActivityRoute) => void;
}) {
  const t = useT();
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDestinationId(null);

    fetch("/api/activities/cycling/resolve-destination", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destinationLabel,
        lat: destinationLat ?? undefined,
        lon: destinationLon ?? undefined,
      }),
    })
      .then(async (r) => {
        const data = (await r.json()) as {
          id?: string;
          center?: { lat: number; lng: number };
          error?: string;
        };
        if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        if (!data.id || !data.center) {
          throw new Error(t("search.cyclingRoutesMissingDestination"));
        }
        setDestinationId(data.id);
        setCenter(data.center);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(
          e instanceof Error ? e.message : t("search.cyclingRoutesLoadError"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [destinationLabel, destinationLat, destinationLon, t]);

  const destinationCenter =
    destinationLat != null &&
    destinationLon != null &&
    Number.isFinite(destinationLat) &&
    Number.isFinite(destinationLon)
      ? { lat: destinationLat, lng: destinationLon }
      : center;

  const effectiveRegionCenter = regionCenter ?? destinationCenter;

  return (
    <section className="mb-10">
      <h2 className="font-display mb-2 text-xl font-bold text-text-primary">
        {t("search.cyclingRoutesTitle")}
      </h2>
      {regionCenter && (
        <p className="mb-4 text-sm text-text-secondary">
          Trasy w promieniu ±{regionRadiusKm} km od wybranego rejonu.
        </p>
      )}

      {loading && <SkeletonList count={4} />}
      {error && !loading && (
        <p className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-text-secondary">
          {error}
        </p>
      )}
      {!loading && destinationId && effectiveRegionCenter && destinationCenter && (
        <ActivityPanel
          activity="cycling"
          destinationId={destinationId}
          destinationCenter={destinationCenter}
          regionCenter={effectiveRegionCenter}
          regionRadiusKm={regionRadiusKm}
          defaultShowCyclOsm
          planRouteIds={planRouteIds}
          onTogglePlanRoute={onTogglePlanRoute}
        />
      )}
    </section>
  );
}

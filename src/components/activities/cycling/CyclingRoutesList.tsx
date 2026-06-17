"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { SkeletonList } from "@/components/ui/Skeleton";
import { CyclingRouteCard } from "./CyclingRouteCard";
import { CyclingMapLayer } from "./CyclingMapLayer";
import { useCyclingActivity } from "./CyclingActivityContext";
import type { ActivityComponentProps } from "@/lib/activities/registry";
import { getGoogleMapsApiKey } from "@/lib/maps/google-maps-config";
import { loadGoogleMaps } from "@/lib/maps/load-google-maps";
import { useLocale } from "@/i18n/locale-provider";
import { Button } from "@/components/ui/Button";
import {
  BATCH_ROUTE_COUNT,
  distributeRouteCounts,
} from "@/lib/activities/cycling/route-distribution";

export function CyclingRoutesList({ destinationId }: ActivityComponentProps) {
  const {
    routes,
    loading,
    error,
    selectedRouteId,
    setSelectedRouteId,
    planRouteIds,
    togglePlanRoute,
    showCyclOsm,
    setShowCyclOsm,
    refreshRoutes,
    generateRoutes,
    generating,
    generatingCount,
    routeCenter,
    regionRadiusKm,
    regionCenters,
    regionBatchSummary,
    routeBeachHints,
    hasBeachFocus,
    routePaths,
  } = useCyclingActivity();

  const generateButtonLabel = useMemo(() => {
    if (regionCenters.length <= 1) {
      return `Wygeneruj ${BATCH_ROUTE_COUNT} tras`;
    }
    const split = distributeRouteCounts(
      BATCH_ROUTE_COUNT,
      regionCenters.length,
    ).join("+");
    return `Wygeneruj ${BATCH_ROUTE_COUNT} tras (${split})`;
  }, [regionCenters.length]);

  const { locale } = useLocale();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey || !mapContainerRef.current || mapRef.current) return;

    let cancelled = false;

    void loadGoogleMaps(apiKey, locale)
      .then((maps) => {
        if (cancelled || !mapContainerRef.current) return;

        const map = new maps.Map(mapContainerRef.current, {
          center: routeCenter ?? { lat: 39.6, lng: 2.9 },
          zoom: 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        mapRef.current = map;
        setMapInstance(map);
        setMapReady(true);
      })
      .catch((e) => {
        if (!cancelled) {
          setMapError(e instanceof Error ? e.message : "Mapa niedostępna");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [locale, destinationId, routeCenter]);

  useEffect(() => {
    if (!mapInstance || routePaths.length === 0) return;
    const selected = routePaths.find(
      (r) => r.id === selectedRouteId && r.path.length > 0,
    );
    const target = selected ?? routePaths.find((r) => r.path.length > 0);
    if (!target) return;
    const bounds = new google.maps.LatLngBounds();
    for (const point of target.path) bounds.extend(point);
    mapInstance.fitBounds(bounds, 48);
  }, [routePaths, mapInstance, selectedRouteId]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] lg:items-start">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-default px-4 py-2.5">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={showCyclOsm}
              onChange={(e) => setShowCyclOsm(e.target.checked)}
              className="accent-brand-700"
            />
            Pokaż szlaki rowerowe
          </label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={generating}
              onClick={() => void generateRoutes()}
            >
              {generating
                ? `Generuję ${generatingCount} tras…`
                : generateButtonLabel}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void refreshRoutes()}>
              Odśwież
            </Button>
          </div>
        </div>
        <CardBody className="p-0">
          {mapError ? (
            <p className="p-5 text-sm text-danger">{mapError}</p>
          ) : (
            <div ref={mapContainerRef} className="h-[min(72vh,560px)] w-full" />
          )}
          {mapReady && mapInstance && (
            <CyclingMapLayer
              map={mapInstance}
              selectedRouteId={selectedRouteId}
              onRouteSelect={(id) => setSelectedRouteId(id)}
              showCyclOsm={showCyclOsm}
              routes={routePaths}
            />
          )}
        </CardBody>
      </Card>

      <aside className="flex max-h-[min(72vh,560px)] min-h-0 flex-col rounded-xl border border-border-default bg-white shadow-sm">
        <div className="shrink-0 border-b border-border-default px-3 py-2.5">
          <h3 className="font-display text-sm font-bold text-text-primary">
            Trasy ({routes.length})
            {hasBeachFocus && (
              <span className="ml-1.5 text-xs font-normal text-emerald-700">
                · blisko plaż
              </span>
            )}
            {regionRadiusKm > 0 && (
              <span className="ml-1.5 text-xs font-normal text-text-secondary">
                · rejon ±{regionRadiusKm} km
              </span>
            )}
          </h3>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-1.5 overflow-y-auto p-2 sm:grid-cols-2">
          {(loading || generating) && routes.length === 0 && (
            <SkeletonList count={4} />
          )}
          {generating && routes.length > 0 && (
            <p className="col-span-full px-1 text-xs text-text-secondary">
              Generuję {generatingCount} tras
              {regionBatchSummary ? ` (${regionBatchSummary})` : " w rejonie"}…
            </p>
          )}
          {error && <p className="px-1 text-sm text-danger">{error}</p>}
          {!loading && !generating && !error && routes.length === 0 && (
            <p className="px-1 text-sm text-text-secondary">Brak tras.</p>
          )}
          {routes.map((route) => (
            <CyclingRouteCard
              key={route.id}
              route={route}
              selected={selectedRouteId === route.id}
              inPlan={planRouteIds.has(route.id)}
              beachProximity={routeBeachHints.get(route.id) ?? null}
              compact
              compactGrid
              onSelect={() =>
                setSelectedRouteId(selectedRouteId === route.id ? null : route.id)
              }
              onTogglePlan={() => togglePlanRoute(route)}
            />
          ))}
        </div>
      </aside>
    </div>
  );
}

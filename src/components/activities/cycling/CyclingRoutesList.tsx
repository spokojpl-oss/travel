"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SkeletonList } from "@/components/ui/Skeleton";
import { CyclingRouteCard } from "./CyclingRouteCard";
import { CyclingMapLayer } from "./CyclingMapLayer";
import { useCyclingActivity } from "./CyclingActivityContext";
import type { ActivityComponentProps } from "@/lib/activities/registry";
import { getGoogleMapsApiKey } from "@/lib/maps/google-maps-config";
import { loadGoogleMaps } from "@/lib/maps/load-google-maps";
import { useLocale } from "@/i18n/locale-provider";
import { Button } from "@/components/ui/Button";

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
    routePaths,
    refreshRoutes,
    generateRoute,
    generating,
    destinationCenter,
  } = useCyclingActivity();

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
          center: destinationCenter ?? { lat: 39.6, lng: 2.9 },
          zoom: 10,
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
  }, [locale, destinationId, destinationCenter]);

  useEffect(() => {
    if (!mapInstance || routePaths.length === 0) return;
    const first = routePaths.find((r) => r.path.length > 0);
    if (!first) return;
    const bounds = new google.maps.LatLngBounds();
    for (const point of first.path) bounds.extend(point);
    mapInstance.fitBounds(bounds, 48);
  }, [routePaths, mapInstance]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Trasy rowerowe"
          action={
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="primary"
                disabled={generating}
                onClick={() => void generateRoute()}
              >
                {generating ? "Generuję…" : "Wygeneruj trasę"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void refreshRoutes()}>
                Odśwież
              </Button>
            </div>
          }
        />
        <CardBody className="space-y-3">
          {loading && <SkeletonList count={3} />}
          {error && <p className="text-sm text-danger">{error}</p>}
          {!loading && !error && routes.length === 0 && (
            <p className="text-sm text-text-secondary">
              Brak tras w bazie. Kliknij <strong>Wygeneruj trasę</strong> (wymaga
              ORS_API_KEY) albo uruchom scraper OSM lokalnie.
            </p>
          )}
          {routes.map((route) => (
            <CyclingRouteCard
              key={route.id}
              route={route}
              selected={selectedRouteId === route.id}
              inPlan={planRouteIds.has(route.id)}
              onSelect={() =>
                setSelectedRouteId(
                  selectedRouteId === route.id ? null : route.id,
                )
              }
              onTogglePlan={() => togglePlanRoute(route.id)}
            />
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Mapa tras"
          action={
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={showCyclOsm}
                onChange={(e) => setShowCyclOsm(e.target.checked)}
                className="accent-brand-700"
              />
              Pokaż szlaki rowerowe
            </label>
          }
        />
        <CardBody className="p-0">
          {mapError ? (
            <p className="p-5 text-sm text-danger">{mapError}</p>
          ) : (
            <div
              ref={mapContainerRef}
              className="h-[420px] w-full rounded-b-xl"
            />
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
    </div>
  );
}

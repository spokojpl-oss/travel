"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/Icon";
import { useLocale, useT } from "@/i18n/locale-provider";
import { loadGoogleMaps } from "@/lib/maps/load-google-maps";
import {
  getGoogleMapsApiKey,
  googleMapsDirectionsUrl,
  googleMapsPlaceUrl,
} from "@/lib/maps/google-maps-config";
import type { MapPoint, MapPointType, MapRouteSegment, ResolvedMapRoute } from "@/lib/maps/types";

const LEGEND_ORDER: MapPointType[] = ["centroid", "attraction", "airport", "hotel"];

const LEGEND_LABEL_KEYS: Record<MapPointType, "map.legendBase" | "map.legendAttraction" | "map.legendAirport" | "map.legendHotel"> = {
  centroid: "map.legendBase",
  attraction: "map.legendAttraction",
  airport: "map.legendAirport",
  hotel: "map.legendHotel",
};

const POINT_COLORS: Record<MapPoint["type"], string> = {
  airport: "#003faa",
  hotel: "#ff5b00",
  attraction: "#16a34a",
  centroid: "#ff5b00",
};

type RegionMapProps = {
  points: MapPoint[];
  segments: MapRouteSegment[];
  className?: string;
  height?: number;
  showLegend?: boolean;
  showRouteList?: boolean;
  highlightedPointId?: string | null;
  onPointClick?: (point: MapPoint) => void;
  /** Bez dymka Google Maps — klik tylko do panelu bocznego. */
  suppressInfoWindow?: boolean;
};

export function RegionMap({
  points,
  segments,
  className,
  height = 450,
  showLegend = true,
  showRouteList = true,
  highlightedPointId,
  onPointClick,
  suppressInfoWindow = false,
}: RegionMapProps) {
  const apiKey = getGoogleMapsApiKey();
  const { locale } = useLocale();
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapsApiRef = useRef<typeof google.maps | null>(null);
  const markersByIdRef = useRef<globalThis.Map<string, google.maps.Marker>>(
    new globalThis.Map(),
  );
  const onPointClickRef = useRef(onPointClick);
  onPointClickRef.current = onPointClick;
  const overlaysRef = useRef<Array<google.maps.Marker | google.maps.Polyline>>(
    [],
  );
  const [routes, setRoutes] = useState<ResolvedMapRoute[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const pointsKey = useMemo(
    () => points.map((p) => `${p.id}:${p.lat},${p.lon}`).join("|"),
    [points],
  );

  const segmentKey = useMemo(
    () =>
      segments
        .map(
          (s) =>
            `${s.id}:${s.fromLat},${s.fromLon}->${s.toLat},${s.toLon}`,
        )
        .join("|"),
    [segments],
  );

  useEffect(() => {
    if (!apiKey) {
      setMapError(
        "Brak NEXT_PUBLIC_GOOGLE_MAPS_API_KEY — dodaj klucz w .env.local i włącz Maps JavaScript API w Google Cloud.",
      );
      return;
    }

    if (!containerRef.current || points.length === 0) return;

    let cancelled = false;

    const clearOverlays = () => {
      for (const overlay of overlaysRef.current) {
        overlay.setMap(null);
      }
      overlaysRef.current = [];
      markersByIdRef.current.clear();
    };

    loadGoogleMaps(apiKey, locale)
      .then((maps) => {
        if (cancelled || !containerRef.current) return;

        clearOverlays();
        mapRef.current = null;
        mapsApiRef.current = maps;

        const center = points[0];
        const map = new maps.Map(containerRef.current, {
          center: { lat: center.lat, lng: center.lon },
          zoom: 10,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        const bounds = new maps.LatLngBounds();

        for (const point of points) {
          const position = { lat: point.lat, lng: point.lon };
          bounds.extend(position);

          const marker = new maps.Marker({
            position,
            map,
            title: point.label,
            icon: markerIcon(maps, point, highlightedPointId === point.id),
          });

          if (!suppressInfoWindow) {
            const mapsUrl = googleMapsPlaceUrl(
              { lat: point.lat, lon: point.lon },
              point.label,
              locale,
            );

            const info = new maps.InfoWindow({
              content: `<div style="min-width:160px;font-family:system-ui,sans-serif">
                <strong>${escapeHtml(point.label)}</strong>
                ${point.badge ? `<div style="font-size:12px;color:#5a6878;margin-top:4px">${escapeHtml(point.badge)}</div>` : ""}
                <div style="margin-top:8px">
                  <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("map.openInGoogleMaps"))}</a>
                </div>
              </div>`,
            });

            marker.addListener("click", () => {
              onPointClickRef.current?.(point);
              info.open({ map, anchor: marker });
            });
          } else {
            marker.addListener("click", () => {
              onPointClickRef.current?.(point);
            });
          }

          markersByIdRef.current.set(point.id, marker);
          overlaysRef.current.push(marker);
        }

        map.fitBounds(bounds, 48);
        mapRef.current = map;
        setMapReady(true);
        setMapError(null);
      })
      .catch((error) => {
        setMapError(
          error instanceof Error ? error.message : "Nie udało się wczytać mapy",
        );
      });

    return () => {
      cancelled = true;
      clearOverlays();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [apiKey, locale, pointsKey, points, suppressInfoWindow, t]);

  useEffect(() => {
    const maps = mapsApiRef.current;
    if (!maps || !mapReady) return;

    for (const point of points) {
      const marker = markersByIdRef.current.get(point.id);
      if (!marker) continue;
      marker.setIcon(markerIcon(maps, point, highlightedPointId === point.id));
    }
  }, [highlightedPointId, mapReady, points, pointsKey]);

  useEffect(() => {
    if (segments.length === 0) {
      setRoutes([]);
      return;
    }

    let cancelled = false;
    setLoadingRoutes(true);

    fetch("/api/routes/driving", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        segments: segments.map((segment) => ({
          id: segment.id,
          from: { lat: segment.fromLat, lon: segment.fromLon },
          to: { lat: segment.toLat, lon: segment.toLon },
        })),
      }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<{ routes: ResolvedMapRoute[] }>;
      })
      .then((data) => {
        if (!cancelled) setRoutes(data.routes ?? []);
      })
      .catch(() => {
        if (!cancelled) setRoutes([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRoutes(false);
      });

    return () => {
      cancelled = true;
    };
  }, [segmentKey, segments]);

  useEffect(() => {
    if (!mapRef.current || !mapReady || !apiKey) return;

    const map = mapRef.current;
    const maps = window.google?.maps;
    if (!maps) return;

    const routeOverlays: google.maps.Polyline[] = [];

    for (const route of routes) {
      const isRoad = route.source === "google" || route.source === "osrm";
      const polyline = new maps.Polyline({
        path: route.geometry.map(([lat, lon]) => ({ lat, lng: lon })),
        map,
        strokeColor: isRoad ? "#003faa" : "#8a96a3",
        strokeWeight: isRoad ? 4 : 2,
        strokeOpacity: isRoad ? 0.85 : 0.6,
      });

      routeOverlays.push(polyline);
      overlaysRef.current.push(polyline);
    }

    return () => {
      for (const overlay of routeOverlays) {
        overlay.setMap(null);
        overlaysRef.current = overlaysRef.current.filter((o) => o !== overlay);
      }
    };
  }, [routes, mapReady, apiKey]);

  if (points.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl border border-border-default bg-bg-soft text-sm text-text-tertiary",
          className,
        )}
        style={{ height }}
      >
        {t("map.noLocationData")}
      </div>
    );
  }

  const pointById = new Map(points.map((p) => [p.id, p]));

  const legendTypes = LEGEND_ORDER.filter((type) =>
    points.some((p) => p.type === type),
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border-default bg-white shadow-card",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default px-4 py-3">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Icon name="map-pin" size={16} className="text-brand-700" />
          {t("map.title")}
        </div>
        {showLegend && legendTypes.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
            {legendTypes.map((type) => (
              <LegendDot
                key={type}
                color={POINT_COLORS[type]}
                label={t(LEGEND_LABEL_KEYS[type])}
              />
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <div
          ref={containerRef}
          style={{ height }}
          className="z-0 w-full bg-bg-soft"
        />
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/95 p-6 text-center text-sm text-text-secondary">
            {mapError}
          </div>
        )}
        {loadingRoutes && !mapError && (
          <div className="absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-medium text-text-secondary shadow-sm">
            {t("map.calculatingRoutes")}
          </div>
        )}
      </div>

      <p className="border-t border-border-default px-4 py-2 text-xs text-text-tertiary">
        {t("map.languageHint")}
      </p>

      {showRouteList && routes.length > 0 && (
        <div className="border-t border-border-default px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            {t("map.drivingDistances")}
          </p>
          <ul className="space-y-2 text-sm">
            {routes.map((route) => {
              const segment = segments.find((s) => s.id === route.id);
              if (!segment) return null;
              const from = pointById.get(segment.from);
              const to = pointById.get(segment.to);
              if (!from || !to) return null;

              const directionsUrl = googleMapsDirectionsUrl(
                { lat: from.lat, lon: from.lon },
                { lat: to.lat, lon: to.lon },
                locale,
              );

              return (
                <li
                  key={route.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bg-soft px-3 py-2"
                >
                  <span>
                    <strong>{from.label}</strong> → <strong>{to.label}</strong>
                    {": "}
                    <span className="numeric font-semibold text-brand-700">
                      {route.distance_km} km
                    </span>
                    {" · "}
                    <span className="text-text-secondary">
                      ~{route.duration_min} min
                    </span>
                    {route.source === "straight" && (
                      <span className="text-text-tertiary"> ({t("map.estimate")})</span>
                    )}
                    {route.source === "google" && (
                      <span className="text-text-tertiary"> (Google)</span>
                    )}
                  </span>
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-brand-700 hover:underline"
                  >
                    {t("map.navigate")} →
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function RegionMapMini({
  points,
  segments,
  className,
}: {
  points: MapPoint[];
  segments: MapRouteSegment[];
  className?: string;
}) {
  return (
    <RegionMap
      points={points}
      segments={segments}
      className={className}
      height={280}
      showLegend={false}
      showRouteList={false}
    />
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function markerIcon(
  maps: typeof google.maps,
  point: MapPoint,
  isHighlighted: boolean,
): google.maps.SymbolIcon {
  const fillColor =
    isHighlighted && point.type === "attraction"
      ? "#ff5b00"
      : POINT_COLORS[point.type];

  return {
    path: maps.SymbolPath.CIRCLE,
    scale:
      point.type === "airport"
        ? 13
        : isHighlighted
          ? 12
          : point.type === "centroid"
            ? 11
            : 8,
    fillColor,
    fillOpacity: 1,
    strokeColor: isHighlighted ? "#ff5b00" : "#ffffff",
    strokeWeight: point.type === "airport" || isHighlighted ? 3 : 2,
  };
}

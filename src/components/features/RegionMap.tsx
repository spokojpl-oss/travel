"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/Icon";
import { loadLeaflet } from "@/lib/maps/load-leaflet";
import {
  googleMapsDirectionsUrl,
  googleMapsPlaceUrl,
} from "@/lib/routing/osrm";
import type { MapPoint, MapRouteSegment, ResolvedMapRoute } from "@/lib/maps/types";

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
};

export function RegionMap({
  points,
  segments,
  className,
  height = 450,
  showLegend = true,
  showRouteList = true,
}: RegionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
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
    if (!containerRef.current || points.length === 0) return;

    let cancelled = false;
    let map: L.Map | null = null;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return;

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        map = L.map(containerRef.current, {
          scrollWheelZoom: true,
          zoomControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        const bounds = L.latLngBounds(
          points.map((p) => [p.lat, p.lon] as [number, number]),
        );

        for (const point of points) {
          const color = POINT_COLORS[point.type];
          const icon = L.divIcon({
            className: "region-map-marker",
            html: markerHtml(point.type, color),
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          const mapsUrl = googleMapsPlaceUrl(
            { lat: point.lat, lon: point.lon },
            point.label,
          );

          L.marker([point.lat, point.lon], { title: point.label, icon })
            .addTo(map!)
            .bindPopup(
              `<div style="min-width:160px">
                <strong>${escapeHtml(point.label)}</strong>
                ${point.badge ? `<div style="font-size:12px;color:#5a6878">${escapeHtml(point.badge)}</div>` : ""}
                <div style="margin-top:8px">
                  <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer">Otwórz w Google Maps</a>
                </div>
              </div>`,
            );
        }

        map.fitBounds(bounds, { padding: [40, 40] });
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
      if (map) {
        map.remove();
      }
      mapRef.current = null;
      setMapReady(false);
    };
  }, [pointsKey, points]);

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
    if (!mapRef.current || !mapReady) return;

    const map = mapRef.current;
    const layers: L.Polyline[] = [];

    for (const route of routes) {
      const isRoad = route.source === "osrm";
      const polyline = L.polyline(route.geometry, {
        color: isRoad ? "#003faa" : "#8a96a3",
        weight: isRoad ? 4 : 2,
        opacity: 0.85,
        dashArray: isRoad ? undefined : "8 6",
      }).addTo(map);

      const midpoint = route.geometry[Math.floor(route.geometry.length / 2)];
      if (midpoint) {
        polyline.bindPopup(
          `${route.distance_km} km · ~${route.duration_min} min jazdy${
            isRoad ? "" : " (linia prosta)"
          }`,
        );
      }

      layers.push(polyline);
    }

    return () => {
      for (const layer of layers) {
        layer.remove();
      }
    };
  }, [routes, mapReady]);

  if (points.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl border border-border-default bg-bg-soft text-sm text-text-tertiary",
          className,
        )}
        style={{ height }}
      >
        Brak danych lokalizacji
      </div>
    );
  }

  const pointById = new Map(points.map((p) => [p.id, p]));

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
          Mapa z drogami (OpenStreetMap)
        </div>
        {showLegend && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
            <LegendDot color={POINT_COLORS.centroid} label="Centrum" />
            <LegendDot color={POINT_COLORS.attraction} label="Atrakcja" />
            <LegendDot color={POINT_COLORS.airport} label="Lotnisko" />
            <LegendDot color={POINT_COLORS.hotel} label="Hotel" />
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
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 p-6 text-center text-sm text-danger">
            {mapError}
          </div>
        )}
        {loadingRoutes && (
          <div className="absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-medium text-text-secondary shadow-sm">
            Liczę trasy drogowe…
          </div>
        )}
      </div>

      {showRouteList && routes.length > 0 && (
        <div className="border-t border-border-default px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Odległości samochodem
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
                    {route.source !== "osrm" && (
                      <span className="text-text-tertiary"> (szacunek)</span>
                    )}
                  </span>
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-brand-700 hover:underline"
                  >
                    Nawiguj w Google Maps →
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

function markerHtml(type: MapPoint["type"], color: string): string {
  if (type === "centroid") {
    return `<div style="width:28px;height:28px;border-radius:50%;background:#fff;border:3px solid ${color};display:flex;align-items:center;justify-content:center;font-weight:700;color:${color};font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,.2)">+</div>`;
  }
  if (type === "airport") {
    return `<div style="width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:18px solid ${color};filter:drop-shadow(0 2px 4px rgba(0,0,0,.25))"></div>`;
  }
  if (type === "hotel") {
    return `<div style="width:16px;height:16px;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25)"></div>`;
  }
  return `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25)"></div>`;
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

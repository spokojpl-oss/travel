"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/Icon";
import { useLocale, useT } from "@/i18n/locale-provider";
import { loadGoogleMaps } from "@/lib/maps/load-google-maps";
import { getGoogleMapsApiKey } from "@/lib/maps/google-maps-config";
import { applyNeutralMapViewport } from "@/lib/maps/map-viewport";
import type { LodgingAreaOption } from "@/lib/plan/lodging-sub-areas";
import type { IslandMapAirport } from "@/lib/maps/build-island-map";
import type { MapCyclingRouteOverlay } from "@/lib/maps/cycling-route-overlays";

const AREA_COLORS = [
  "#003faa",
  "#0891b2",
  "#7c3aed",
  "#059669",
  "#d97706",
  "#dc2626",
];

type LodgingBaseMapProps = {
  options: LodgingAreaOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  attractions?: Array<{ id: string; name: string; lat: number; lon: number }>;
  airports?: IslandMapAirport[];
  cyclingRoutes?: MapCyclingRouteOverlay[];
  className?: string;
};

export function LodgingBaseMap({
  options,
  selectedId,
  onSelect,
  attractions = [],
  airports = [],
  cyclingRoutes = [],
  className,
}: LodgingBaseMapProps) {
  const apiKey = getGoogleMapsApiKey();
  const { locale } = useLocale();
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapsApiRef = useRef<typeof google.maps | null>(null);
  const overlaysRef = useRef<Array<google.maps.Marker | google.maps.Polyline>>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const viewportKeyRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const optionsKey = useMemo(
    () =>
      [
        options.map((o) => `${o.id}:${o.lat},${o.lon}:${o.radiusKm}`).join("|"),
        attractions.map((a) => `${a.id}:${a.lat},${a.lon}`).join("|"),
        airports.map((a) => a.iata_code).join("|"),
        cyclingRoutes.map((r) => `${r.id}:${r.path.length}`).join("|"),
      ].join(";"),
    [options, attractions, airports, cyclingRoutes],
  );

  useEffect(() => {
    if (!apiKey) {
      setMapError(t("map.missingApiKey"));
      return;
    }
    if (!containerRef.current || options.length === 0) return;

    let cancelled = false;

    loadGoogleMaps(apiKey, locale)
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        mapsApiRef.current = maps;

        const map = new maps.Map(containerRef.current, {
          center: { lat: options[0]!.lat, lng: options[0]!.lon },
          zoom: 9,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        mapRef.current = map;
        setMapReady(true);
        setMapError(null);

        const viewportPoints = options.map((option) => ({
          lat: option.lat,
          lng: option.lon,
        }));
        applyNeutralMapViewport(map, maps, viewportPoints);
        viewportKeyRef.current = optionsKey;
      })
      .catch((error) => {
        setMapError(
          error instanceof Error ? error.message : t("map.loadFailed"),
        );
      });

    return () => {
      cancelled = true;
      mapRef.current = null;
      setMapReady(false);
    };
  }, [apiKey, locale, optionsKey, options.length, t]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = mapsApiRef.current;
    if (!map || !maps || !mapReady || options.length === 0) return;
    if (viewportKeyRef.current !== optionsKey) {
      const viewportPoints = options.map((option) => ({
        lat: option.lat,
        lng: option.lon,
      }));
      applyNeutralMapViewport(map, maps, viewportPoints);
      viewportKeyRef.current = optionsKey;
    }
  }, [mapReady, options, optionsKey]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = mapsApiRef.current;
    if (!map || !maps || !mapReady || options.length === 0) return;

    for (const overlay of overlaysRef.current) {
      overlay.setMap(null);
    }
    overlaysRef.current = [];

    for (const airport of airports) {
      const pos = { lat: airport.lat, lng: airport.lon };
      const marker = new maps.Marker({
        map,
        position: pos,
        title: `${airport.name} (${airport.iata_code})`,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#003faa",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
      overlaysRef.current.push(marker);
    }

    for (const route of cyclingRoutes) {
      const polyline = new maps.Polyline({
        path: route.path,
        map,
        strokeColor: "#15803d",
        strokeWeight: 4,
        strokeOpacity: 0.88,
        zIndex: 1,
      });
      overlaysRef.current.push(polyline);
    }

    for (const attraction of attractions) {
      const pos = { lat: attraction.lat, lng: attraction.lon };
      const marker = new maps.Marker({
        map,
        position: pos,
        title: attraction.name,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 5,
          fillColor: "#16a34a",
          fillOpacity: 0.85,
          strokeColor: "#ffffff",
          strokeWeight: 1,
        },
      });
      overlaysRef.current.push(marker);
    }

    options.forEach((option, index) => {
      const center = { lat: option.lat, lng: option.lon };
      const isSelected = selectedId === option.id;
      const color = AREA_COLORS[index % AREA_COLORS.length]!;

      const marker = new maps.Marker({
        map,
        position: center,
        title: option.name,
        label: {
          text: String(index + 1),
          color: "#ffffff",
          fontWeight: "700",
          fontSize: "11px",
        },
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: isSelected ? 15 : 13,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: isSelected ? "#1e293b" : "#ffffff",
          strokeWeight: isSelected ? 3 : 2,
        },
      });

      marker.addListener("click", () => {
        onSelectRef.current(option.id);
      });

      overlaysRef.current.push(marker);
    });
  }, [mapReady, options, optionsKey, selectedId, attractions, airports, cyclingRoutes]);

  if (options.length === 0) return null;

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
          {t("lodgingBase.mapTitle")}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
          {options.map((option, index) => (
            <span key={option.id} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: AREA_COLORS[index % AREA_COLORS.length] }}
              />
              {option.name}
            </span>
          ))}
          {airports.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-700" />
              {t("map.legendAirport")}
            </span>
          )}
          {attractions.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-600" />
              {t("lodgingBase.legendAttractions")} ({attractions.length})
            </span>
          )}
          {cyclingRoutes.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-700" />
              {t("map.legendCyclingRoute")} ({cyclingRoutes.length})
            </span>
          )}
        </div>
      </div>

      <div className="relative">
        <div
          ref={containerRef}
          style={{ height: 420 }}
          className="z-0 w-full bg-bg-soft"
        />
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/95 p-6 text-center text-sm text-text-secondary">
            {mapError}
          </div>
        )}
      </div>

      <p className="border-t border-border-default px-4 py-2 text-xs text-text-tertiary">
        {t("lodgingBase.mapHint")}
      </p>
    </div>
  );
}

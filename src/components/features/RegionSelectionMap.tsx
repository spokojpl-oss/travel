"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { useLocale, useT } from "@/i18n/locale-provider";
import { loadGoogleMaps } from "@/lib/maps/load-google-maps";
import {
  getGoogleMapsApiKey,
  localizeGoogleMapsUrl,
} from "@/lib/maps/google-maps-config";
import {
  regionDisplayName,
  regionMapRadiusKm,
  type ScoredTouristRegion,
} from "@/lib/destinations/tourist-regions";

const REGION_COLORS = [
  "#003faa",
  "#16a34a",
  "#7c3aed",
  "#0891b2",
  "#ca8a04",
  "#db2777",
  "#ea580c",
  "#059669",
  "#6366f1",
];

const CYPRUS_AIRPORTS = [
  { iata: "LCA", name: "Larnaca", lat: 34.875, lon: 33.625 },
  { iata: "PFO", name: "Pafos", lat: 34.718, lon: 32.486 },
  { iata: "ECN", name: "Ercan", lat: 35.155, lon: 33.496 },
];

function isCyprusRegions(regions: ScoredTouristRegion[]): boolean {
  return regions.some((r) => r.id.startsWith("cy-"));
}

type RegionSelectionMapProps = {
  regions: ScoredTouristRegion[];
  /** Rejon aktualnie podglądany w panelu bocznym. */
  focusedId: string | null;
  /** Potwierdzone rejony (do 3). */
  selectedIds: string[];
  onFocus: (regionId: string) => void;
  className?: string;
  height?: number;
};

export function RegionSelectionMap({
  regions,
  focusedId,
  selectedIds,
  onFocus,
  className,
  height = 360,
}: RegionSelectionMapProps) {
  const apiKey = getGoogleMapsApiKey();
  const { locale } = useLocale();
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<Array<google.maps.Circle | google.maps.Marker>>(
    [],
  );
  const [mapError, setMapError] = useState<string | null>(null);

  const regionsKey = regions.map((r) => r.id).join("|");
  const selectionKey = `${focusedId ?? ""}|${selectedIds.join(",")}`;

  useEffect(() => {
    if (!apiKey || regions.length === 0 || !containerRef.current) return;

    let cancelled = false;

    const clearOverlays = () => {
      for (const overlay of overlaysRef.current) {
        overlay.setMap(null);
      }
      overlaysRef.current = [];
    };

    loadGoogleMaps(apiKey, locale)
      .then((maps) => {
        if (cancelled || !containerRef.current) return;

        clearOverlays();
        mapRef.current = null;

        const first = regions[0]!;
        const map = new maps.Map(containerRef.current, {
          center: { lat: first.center_lat, lng: first.center_lon },
          zoom: 9,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        const bounds = new maps.LatLngBounds();

        regions.forEach((region, index) => {
          const center = { lat: region.center_lat, lng: region.center_lon };
          const radiusM = regionMapRadiusKm(region) * 1000;
          const isSelected = selectedIds.includes(region.id);
          const isFocused = region.id === focusedId;
          const baseColor =
            REGION_COLORS[index % REGION_COLORS.length] ?? "#003faa";
          const color = isSelected ? "#ff5b00" : baseColor;

          bounds.extend(center);

          const circle = new maps.Circle({
            map,
            center,
            radius: radiusM,
            strokeColor: color,
            strokeOpacity: isFocused ? 1 : 0.85,
            strokeWeight: isFocused ? 4 : isSelected ? 3 : 2,
            fillColor: color,
            fillOpacity: isSelected ? 0.32 : isFocused ? 0.22 : 0.14,
            clickable: true,
          });

          circle.addListener("click", () => onFocus(region.id));

          const marker = new maps.Marker({
            map,
            position: center,
            title: regionDisplayName(region, locale),
            label: {
              text: String(index + 1),
              color: "#ffffff",
              fontWeight: "700",
              fontSize: "11px",
            },
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: isFocused ? 15 : isSelected ? 14 : 12,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: isFocused ? "#1e293b" : "#ffffff",
              strokeWeight: isFocused ? 3 : 2,
            },
          });

          marker.addListener("click", () => onFocus(region.id));

          overlaysRef.current.push(circle, marker);

          const latDelta = regionMapRadiusKm(region) / 111;
          const lonDelta =
            regionMapRadiusKm(region) /
            (111 * Math.cos((region.center_lat * Math.PI) / 180));
          bounds.extend({
            lat: region.center_lat + latDelta,
            lng: region.center_lon + lonDelta,
          });
          bounds.extend({
            lat: region.center_lat - latDelta,
            lng: region.center_lon - lonDelta,
          });
        });

        if (isCyprusRegions(regions)) {
          for (const airport of CYPRUS_AIRPORTS) {
            const pos = { lat: airport.lat, lng: airport.lon };
            bounds.extend(pos);
            const marker = new maps.Marker({
              map,
              position: pos,
              title: `${t("regions.mapAirport")} ${airport.name} (${airport.iata})`,
              icon: {
                path: maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                scale: 5,
                fillColor: "#003faa",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 1,
                rotation: 180,
              },
            });
            overlaysRef.current.push(marker);
          }
        }

        map.fitBounds(bounds, 40);
        mapRef.current = map;
        setMapError(null);
      })
      .catch((error) => {
        setMapError(
          error instanceof Error ? error.message : t("map.noLocationData"),
        );
      });

    return () => {
      cancelled = true;
      clearOverlays();
      mapRef.current = null;
    };
  }, [apiKey, locale, regionsKey, selectionKey, regions, focusedId, selectedIds, onFocus, t]);

  if (regions.length === 0) return null;

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border border-border-default bg-white shadow-card",
        className,
      )}
    >
      <div className="border-b border-border-default px-4 py-3">
        <p className="text-sm font-semibold text-text-primary">
          {t("regions.mapTitle")}
        </p>
        <p className="mt-0.5 text-xs text-text-secondary">
          {t("regions.mapHintDesktop")}
        </p>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={containerRef}
          style={{ height: height, minHeight: "100%" }}
          className="h-full w-full bg-bg-soft lg:!h-full lg:min-h-[480px]"
        />
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/95 p-4 text-center text-sm text-text-secondary">
            {mapError}
          </div>
        )}
      </div>

      <ul className="flex flex-wrap gap-2 border-t border-border-default px-4 py-3 lg:hidden">
        {regions.map((region, index) => {
          const isSelected = selectedIds.includes(region.id);
          const isFocused = region.id === focusedId;
          const color = isSelected
            ? "#ff5b00"
            : (REGION_COLORS[index % REGION_COLORS.length] ?? "#003faa");
          return (
            <li key={region.id}>
              <button
                type="button"
                onClick={() => onFocus(region.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  isFocused
                    ? "border-brand-700 bg-brand-50 text-brand-800"
                    : "border-border-default bg-bg-soft text-text-secondary hover:border-brand-200",
                )}
              >
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {index + 1}
                </span>
                {regionDisplayName(region, locale)}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function regionMapsSearchUrl(
  region: ScoredTouristRegion,
  locale: "pl" | "en",
): string {
  const label = regionDisplayName(region, locale);
  const params = new URLSearchParams({
    api: "1",
    query: `${label}@${region.center_lat},${region.center_lon}`,
    hl: locale === "en" ? "en" : "pl",
  });
  return localizeGoogleMapsUrl(
    `https://www.google.com/maps/search/?${params.toString()}`,
    locale,
  );
}

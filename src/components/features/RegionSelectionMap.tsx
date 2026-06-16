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
  focusedId: string | null;
  selectedIds: string[];
  onFocus: (regionId: string) => void;
  destinationLabel?: string;
  className?: string;
};

export function RegionSelectionMap({
  regions,
  focusedId,
  selectedIds,
  onFocus,
  destinationLabel,
  className,
}: RegionSelectionMapProps) {
  const apiKey = getGoogleMapsApiKey();
  const { locale } = useLocale();
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapsApiRef = useRef<typeof google.maps | null>(null);
  const overlaysRef = useRef<Array<google.maps.Circle | google.maps.Marker>>(
    [],
  );
  const onFocusRef = useRef(onFocus);
  onFocusRef.current = onFocus;

  const [mapError, setMapError] = useState<string | null>(
    apiKey
      ? null
      : "Brak NEXT_PUBLIC_GOOGLE_MAPS_API_KEY — dodaj klucz w .env.local.",
  );
  const [mapReady, setMapReady] = useState(false);

  const regionsKey = regions.map((r) => r.id).join("|");

  /** Jednorazowa inicjalizacja mapy — bez niszczenia przy kliknięciu numerka. */
  useEffect(() => {
    if (!apiKey || regions.length === 0 || !containerRef.current) return;

    let cancelled = false;
    setMapReady(false);

    loadGoogleMaps(apiKey, locale)
      .then((maps) => {
        if (cancelled || !containerRef.current) return;

        mapsApiRef.current = maps;
        const first = regions[0]!;

        const map = new maps.Map(containerRef.current, {
          center: { lat: first.center_lat, lng: first.center_lon },
          zoom: 9,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        mapRef.current = map;
        setMapError(null);
        setMapReady(true);
      })
      .catch((error) => {
        if (!cancelled) {
          setMapError(
            error instanceof Error ? error.message : t("map.noLocationData"),
          );
        }
      });

    return () => {
      cancelled = true;
      for (const overlay of overlaysRef.current) {
        overlay.setMap(null);
      }
      overlaysRef.current = [];
      mapRef.current = null;
      mapsApiRef.current = null;
      setMapReady(false);
      if (containerRef.current) {
        containerRef.current.replaceChildren();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- regions read via regionsKey
  }, [apiKey, locale, regionsKey]);

  /** Overlays — aktualizacja przy focus / select bez przebudowy mapy. */
  useEffect(() => {
    const map = mapRef.current;
    const maps = mapsApiRef.current;
    if (!map || !maps || !mapReady || regions.length === 0) return;

    for (const overlay of overlaysRef.current) {
      overlay.setMap(null);
    }
    overlaysRef.current = [];

    const bounds = new maps.LatLngBounds();

    regions.forEach((region, index) => {
      const center = { lat: region.center_lat, lng: region.center_lon };
      const radiusM = regionMapRadiusKm(region, destinationLabel) * 1000;
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

      circle.addListener("click", () => onFocusRef.current(region.id));

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

      marker.addListener("click", () => onFocusRef.current(region.id));

      overlaysRef.current.push(circle, marker);

      const latDelta = regionMapRadiusKm(region, destinationLabel) / 111;
      const lonDelta =
        regionMapRadiusKm(region, destinationLabel) /
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

    map.fitBounds(bounds, 48);
  }, [mapReady, regions, regionsKey, focusedId, selectedIds, locale, t]);

  if (regions.length === 0) return null;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border-default bg-white shadow-card",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-default px-4 py-2.5">
        <p className="text-sm font-semibold text-text-primary">
          {t("regions.mapTitle")}
        </p>
        <ul className="flex flex-wrap gap-1.5">
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
                  title={regionDisplayName(region, locale)}
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm transition-transform hover:scale-105",
                    isFocused && "ring-2 ring-slate-800 ring-offset-1",
                  )}
                  style={{ backgroundColor: color }}
                >
                  {index + 1}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={containerRef}
          className="z-0 h-[min(70vh,620px)] min-h-[480px] w-full bg-bg-soft"
        />
        {!mapReady && !mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-soft text-sm text-text-secondary">
            …
          </div>
        )}
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/95 p-4 text-center text-sm text-text-secondary">
            {mapError}
          </div>
        )}
      </div>

      <p className="border-t border-border-default px-4 py-2 text-xs text-text-secondary">
        {t("regions.mapHintDesktop")}
      </p>
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

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/Icon";
import { useLocale, useT } from "@/i18n/locale-provider";
import { loadGoogleMaps } from "@/lib/maps/load-google-maps";
import { getGoogleMapsApiKey } from "@/lib/maps/google-maps-config";
import type {
  LodgingBaseChoice,
  LodgingBaseOption,
} from "@/lib/plan/lodging-base-options";

const BASE_COLORS: Record<LodgingBaseChoice, string> = {
  tourist_center: "#0891b2",
  quiet_area: "#003faa",
};

type LodgingBaseMapProps = {
  options: LodgingBaseOption[];
  selectedChoice: LodgingBaseChoice | null;
  onSelect: (choice: LodgingBaseChoice) => void;
  className?: string;
};

export function LodgingBaseMap({
  options,
  selectedChoice,
  onSelect,
  className,
}: LodgingBaseMapProps) {
  const apiKey = getGoogleMapsApiKey();
  const { locale } = useLocale();
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapsApiRef = useRef<typeof google.maps | null>(null);
  const overlaysRef = useRef<Array<google.maps.Marker | google.maps.Circle>>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const optionsKey = useMemo(
    () =>
      options
        .map((o) => `${o.choice}:${o.lat},${o.lon}:${o.radiusKm}`)
        .join("|"),
    [options],
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
          zoom: 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        mapRef.current = map;
        setMapReady(true);
        setMapError(null);
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

    for (const overlay of overlaysRef.current) {
      overlay.setMap(null);
    }
    overlaysRef.current = [];

    const bounds = new maps.LatLngBounds();

    options.forEach((option, index) => {
      const center = { lat: option.lat, lng: option.lon };
      const isSelected = selectedChoice === option.choice;
      const color = BASE_COLORS[option.choice];

      bounds.extend(center);

      const circle = new maps.Circle({
        map,
        center,
        radius: option.radiusKm * 1000,
        strokeColor: color,
        strokeOpacity: isSelected ? 1 : 0.75,
        strokeWeight: isSelected ? 4 : 2,
        fillColor: color,
        fillOpacity: isSelected ? 0.28 : 0.12,
        clickable: true,
      });

      circle.addListener("click", () => {
        onSelectRef.current(option.choice);
      });

      const marker = new maps.Marker({
        map,
        position: center,
        title: option.label,
        label: {
          text: String(index + 1),
          color: "#ffffff",
          fontWeight: "700",
          fontSize: "11px",
        },
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: isSelected ? 14 : 12,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: isSelected ? "#1e293b" : "#ffffff",
          strokeWeight: isSelected ? 3 : 2,
        },
      });

      marker.addListener("click", () => {
        onSelectRef.current(option.choice);
      });

      overlaysRef.current.push(circle, marker);
    });

    map.fitBounds(bounds, 56);
  }, [mapReady, options, optionsKey, selectedChoice]);

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
          {options.map((option) => (
            <span key={option.choice} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: BASE_COLORS[option.choice] }}
              />
              {option.choice === "tourist_center"
                ? t("lodgingBase.legendWaterfront")
                : t("lodgingBase.legendCentre")}
            </span>
          ))}
        </div>
      </div>

      <div className="relative">
        <div
          ref={containerRef}
          style={{ height: 360 }}
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

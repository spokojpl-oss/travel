"use client";

import { useEffect, useRef } from "react";
import type { ActivityMapLayerProps } from "@/lib/activities/registry";

const ROUTE_COLORS = {
  default: "#16a34a",
  hover: "#15803d",
  selected: "#003faa",
};

export function CyclingMapLayer({
  map,
  selectedRouteId,
  onRouteSelect,
  showCyclOsm = false,
  routes = [],
}: ActivityMapLayerProps) {
  const overlayRef = useRef<google.maps.ImageMapType | null>(null);
  const polylinesRef = useRef<Map<string, google.maps.Polyline>>(new Map());
  const hoveredIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!map) return;

    if (showCyclOsm) {
      if (!overlayRef.current) {
        const overlay = new google.maps.ImageMapType({
          getTileUrl: (coord, zoom) => {
            const sub = "abc"[Math.floor(Math.random() * 3)];
            return `https://${sub}.tile-cyclosm.openstreetmap.fr/cyclosm/${zoom}/${coord.x}/${coord.y}.png`;
          },
          tileSize: new google.maps.Size(256, 256),
          opacity: 0.55,
          name: "CyclOSM",
        });
        overlayRef.current = overlay;
        map.overlayMapTypes.insertAt(0, overlay);
      }
    } else if (overlayRef.current) {
      const arr = map.overlayMapTypes.getArray();
      const idx = arr.indexOf(overlayRef.current);
      if (idx >= 0) map.overlayMapTypes.removeAt(idx);
      overlayRef.current = null;
    }
  }, [map, showCyclOsm]);

  useEffect(() => {
    if (!map) return;

    const existing = polylinesRef.current;
    const nextIds = new Set(routes.map((r) => r.id));

    for (const [id, polyline] of existing) {
      if (!nextIds.has(id)) {
        polyline.setMap(null);
        existing.delete(id);
      }
    }

    for (const route of routes) {
      if (route.path.length < 2) continue;

      let polyline = existing.get(route.id);
      const isSelected = route.id === selectedRouteId;
      const strokeColor = isSelected
        ? ROUTE_COLORS.selected
        : ROUTE_COLORS.default;

      if (!polyline) {
        polyline = new google.maps.Polyline({
          path: route.path,
          strokeColor,
          strokeOpacity: 0.85,
          strokeWeight: isSelected ? 5 : 3,
          zIndex: isSelected ? 3 : 1,
          map,
        });

        polyline.addListener("mouseover", () => {
          hoveredIdRef.current = route.id;
          if (route.id !== selectedRouteId) {
            polyline!.setOptions({
              strokeColor: ROUTE_COLORS.hover,
              strokeWeight: 4,
            });
          }
        });

        polyline.addListener("mouseout", () => {
          hoveredIdRef.current = null;
          if (route.id !== selectedRouteId) {
            polyline!.setOptions({
              strokeColor: ROUTE_COLORS.default,
              strokeWeight: 3,
            });
          }
        });

        polyline.addListener("click", () => onRouteSelect(route.id));

        existing.set(route.id, polyline);
      } else {
        polyline.setPath(route.path);
        polyline.setOptions({
          strokeColor,
          strokeWeight: isSelected ? 5 : 3,
          zIndex: isSelected ? 3 : 1,
        });
      }
    }
  }, [map, routes, selectedRouteId, onRouteSelect]);

  useEffect(() => {
    return () => {
      if (!map) return;
      const polylines = polylinesRef.current;
      if (overlayRef.current) {
        const arr = map.overlayMapTypes.getArray();
        const idx = arr.indexOf(overlayRef.current);
        if (idx >= 0) map.overlayMapTypes.removeAt(idx);
        overlayRef.current = null;
      }
      for (const polyline of polylines.values()) {
        polyline.setMap(null);
      }
      polylines.clear();
    };
  }, [map]);

  return null;
}

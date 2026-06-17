export const MAP_NEUTRAL_MAX_ZOOM = 9;
export const MAP_NEUTRAL_PADDING = 56;

export type MapLatLng = { lat: number; lng: number };

/** Szeroki kadr (kraj/wyspa) — bez agresywnego przybliżenia na markerach. */
export function applyNeutralMapViewport(
  map: google.maps.Map,
  maps: typeof google.maps,
  points: MapLatLng[],
  options?: { maxZoom?: number; padding?: number },
): void {
  const maxZoom = options?.maxZoom ?? MAP_NEUTRAL_MAX_ZOOM;
  const padding = options?.padding ?? MAP_NEUTRAL_PADDING;

  if (points.length === 0) return;

  if (points.length === 1) {
    map.setCenter(points[0]!);
    map.setZoom(maxZoom);
    return;
  }

  const bounds = new maps.LatLngBounds();
  for (const point of points) bounds.extend(point);
  map.fitBounds(bounds, padding);

  maps.event.addListenerOnce(map, "idle", () => {
    const zoom = map.getZoom();
    if (zoom != null && zoom > maxZoom) {
      map.setZoom(maxZoom);
    }
  });
}

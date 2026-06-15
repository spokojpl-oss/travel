/* eslint-disable @typescript-eslint/no-namespace */
declare namespace LeafletGlobal {
  type LatLngExpression = [number, number] | { lat: number; lng: number };

  interface MapOptions {
    scrollWheelZoom?: boolean;
    zoomControl?: boolean;
  }

  interface TileLayerOptions {
    attribution?: string;
    maxZoom?: number;
  }

  interface MarkerOptions {
    title?: string;
    icon?: DivIcon;
  }

  interface DivIconOptions {
    className?: string;
    html?: string;
    iconSize?: [number, number];
    iconAnchor?: [number, number];
  }

  interface PolylineOptions {
    color?: string;
    weight?: number;
    opacity?: number;
    dashArray?: string;
  }

  interface LatLngBounds {
    extend(latlng: LatLngExpression): this;
  }

  interface Map {
    fitBounds(bounds: LatLngBounds, options?: { padding?: [number, number] }): this;
    remove(): void;
  }

  interface Layer {
    addTo(map: Map): this;
    remove(): this;
    bindPopup(content: string): this;
  }

  interface Marker extends Layer {}

  interface Polyline extends Layer {}

  interface TileLayer extends Layer {}

  interface DivIcon {}

  function map(element: HTMLElement | string, options?: MapOptions): Map;
  function tileLayer(url: string, options?: TileLayerOptions): TileLayer;
  function marker(latlng: LatLngExpression, options?: MarkerOptions): Marker;
  function polyline(latlngs: LatLngExpression[], options?: PolylineOptions): Polyline;
  function divIcon(options: DivIconOptions): DivIcon;
  function latLngBounds(latlngs: LatLngExpression[]): LatLngBounds;
}

declare const L: typeof LeafletGlobal;

declare namespace L {
  type Map = LeafletGlobal.Map;
  type Polyline = LeafletGlobal.Polyline;
}

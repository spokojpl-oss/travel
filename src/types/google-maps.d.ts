declare namespace google.maps {
  enum SymbolPath {
    CIRCLE = 0,
    BACKWARD_CLOSED_ARROW = 3,
  }

  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  interface MapOptions {
    center?: LatLngLiteral;
    zoom?: number;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
  }

  interface Map {
    fitBounds(bounds: LatLngBounds, padding?: number | Padding): void;
    setCenter(latlng: LatLngLiteral): void;
  }

  interface Padding {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  }

  interface MarkerLabel {
    text: string;
    color?: string;
    fontWeight?: string;
    fontSize?: string;
  }

  interface MarkerOptions {
    position: LatLngLiteral;
    map?: Map | null;
    title?: string;
    icon?: SymbolIcon;
    label?: MarkerLabel | string;
  }

  interface SymbolIcon {
    path: SymbolPath | string;
    scale?: number;
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWeight?: number;
    rotation?: number;
  }

  interface CircleOptions {
    map?: Map | null;
    center?: LatLngLiteral;
    radius?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
    fillColor?: string;
    fillOpacity?: number;
    clickable?: boolean;
  }

  interface Marker {
    setMap(map: Map | null): void;
    addListener(event: string, handler: () => void): MapsEventListener;
  }

  interface Circle {
    setMap(map: Map | null): void;
    addListener(event: string, handler: () => void): MapsEventListener;
  }

  interface PolylineOptions {
    path: LatLngLiteral[];
    map?: Map | null;
    strokeColor?: string;
    strokeWeight?: number;
    strokeOpacity?: number;
    icons?: Array<{
      icon: SymbolIcon;
      offset: string;
      repeat: string;
    }>;
  }

  interface Polyline {
    setMap(map: Map | null): void;
    addListener(event: string, handler: () => void): MapsEventListener;
  }

  interface InfoWindowOptions {
    content?: string;
  }

  interface InfoWindow {
    open(options: { map: Map; anchor?: Marker }): void;
    close(): void;
  }

  interface LatLngBounds {
    extend(point: LatLngLiteral): void;
  }

  interface MapsEventListener {
    remove(): void;
  }

  class Map {
    constructor(el: HTMLElement, opts?: MapOptions);
  }

  class Marker {
    constructor(opts?: MarkerOptions);
  }

  class Circle {
    constructor(opts?: CircleOptions);
  }

  class Polyline {
    constructor(opts?: PolylineOptions);
  }

  class InfoWindow {
    constructor(opts?: InfoWindowOptions);
  }

  class LatLngBounds {
    constructor();
  }
}

interface Window {
  google?: {
    maps: typeof google.maps;
  };
  __travelGoogleMapsInit?: () => void;
}

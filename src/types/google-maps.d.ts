declare namespace google.maps {
  enum SymbolPath {
    CIRCLE = 0,
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

  interface MarkerOptions {
    position: LatLngLiteral;
    map?: Map | null;
    title?: string;
    icon?: SymbolIcon;
  }

  interface SymbolIcon {
    path: SymbolPath | string;
    scale?: number;
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWeight?: number;
  }

  interface Marker {
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

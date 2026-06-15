export type MapPointType = "airport" | "hotel" | "attraction" | "centroid";

export type MapPoint = {
  id: string;
  type: MapPointType;
  label: string;
  lat: number;
  lon: number;
  badge?: string;
};

export type MapRouteSegment = {
  id: string;
  from: string;
  to: string;
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
};

export type ResolvedMapRoute = {
  id: string;
  distance_km: number;
  duration_min: number;
  geometry: Array<[number, number]>;
  source: "google" | "osrm" | "straight";
};

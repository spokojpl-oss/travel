import { distanceKm } from "@/lib/search/geo-clustering";
import {
  regionMapRadiusKm,
  type TouristRegion,
} from "@/lib/destinations/tourist-regions";
import type { AttractionWithActivities, GeoCluster, GeoPoint } from "@/types/domain";

export function regionCenter(region: TouristRegion): GeoPoint {
  return { lat: region.center_lat, lon: region.center_lon };
}

export function pointInTouristRegion(
  point: GeoPoint,
  region: TouristRegion,
  marginKm = 1,
  destinationLabel?: string | null,
): boolean {
  return (
    distanceKm(regionCenter(region), point) <=
    regionMapRadiusKm(region, destinationLabel) + marginKm
  );
}

export function filterAttractionsToTouristRegions(
  attractions: AttractionWithActivities[],
  regions: TouristRegion[],
  marginKm = 1,
  destinationLabel?: string | null,
): AttractionWithActivities[] {
  if (regions.length === 0) return attractions;
  return attractions.filter((a) =>
    regions.some((r) =>
      pointInTouristRegion(
        { lat: Number(a.lat), lon: Number(a.lon) },
        r,
        marginKm,
        destinationLabel,
      ),
    ),
  );
}

export function centroidOfTouristRegions(
  regions: TouristRegion[],
): GeoPoint | null {
  if (regions.length === 0) return null;
  return {
    lat: regions.reduce((s, r) => s + r.center_lat, 0) / regions.length,
    lon: regions.reduce((s, r) => s + r.center_lon, 0) / regions.length,
  };
}

export function clusterInSelectedRegions(
  cluster: GeoCluster,
  regions: TouristRegion[],
  destinationLabel?: string | null,
): boolean {
  return regions.some((r) =>
    pointInTouristRegion(cluster.center, r, 8, destinationLabel),
  );
}

/** Zostaw tylko klastry w wybranych rejonach; gdy brak dopasowania — zwróć oryginał. */
export function filterClustersToTouristRegions(
  clusters: GeoCluster[],
  regions: TouristRegion[],
  destinationLabel?: string | null,
): GeoCluster[] {
  if (regions.length === 0) return clusters;
  const matched = clusters.filter((c) =>
    clusterInSelectedRegions(c, regions, destinationLabel),
  );
  return matched.length > 0 ? matched : clusters;
}

function centroidOfAttractions(
  attractions: AttractionWithActivities[],
): GeoPoint {
  const lat =
    attractions.reduce((s, a) => s + Number(a.lat), 0) / attractions.length;
  const lon =
    attractions.reduce((s, a) => s + Number(a.lon), 0) / attractions.length;
  return { lat, lon };
}

/** Przesuwa centrum klastra pod wybrane rejony turystyczne. */
export function reanchorClusterToTouristRegions(
  cluster: GeoCluster,
  regions: TouristRegion[],
  destinationLabel?: string | null,
): GeoCluster {
  if (regions.length === 0) return cluster;

  const inRegions = filterAttractionsToTouristRegions(
    cluster.attractions,
    regions,
    1,
    destinationLabel,
  );
  const center =
    inRegions.length > 0
      ? centroidOfAttractions(inRegions)
      : (centroidOfTouristRegions(regions) ?? cluster.center);

  const attractions = inRegions.length > 0 ? inRegions : cluster.attractions;
  const radius_km =
    attractions.length > 0
      ? Math.max(
          ...attractions.map((a) =>
            distanceKm(center, { lat: Number(a.lat), lon: Number(a.lon) }),
          ),
          0.5,
        )
      : Math.max(
          ...regions.map((r) => regionMapRadiusKm(r, destinationLabel)),
          5,
        );

  return {
    ...cluster,
    center,
    settlement: undefined,
    radius_km: Math.round(radius_km * 10) / 10,
    attractions,
  };
}

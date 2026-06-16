import type { GeoCluster } from "@/types/domain";

const STORAGE_PREFIX = "travel_dest_build:";

export type DestinationBuildPayload = {
  cluster: GeoCluster;
  activities: string[];
};

export function storeDestinationBuildPayload(
  buildId: string,
  payload: DestinationBuildPayload,
): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(`${STORAGE_PREFIX}${buildId}`, JSON.stringify(payload));
}

export function loadDestinationBuildPayload(
  buildId: string,
): DestinationBuildPayload | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${buildId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DestinationBuildPayload;
  } catch {
    return null;
  }
}

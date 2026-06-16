import type { GeoCluster } from "@/types/domain";
import type { AttractionWithActivities } from "@/types/domain";
import type { LodgingBaseChoice } from "@/lib/plan/lodging-base-options";

export type PlanRegionContext = {
  id?: string;
  name_pl: string;
  name_en: string;
  overview_pl: string;
  overview_en: string;
  stay_hint_pl: string;
  stay_hint_en: string;
};

const STORAGE_PREFIX = "travel_dest_build:";

export type DestinationBuildPayload = {
  cluster: GeoCluster;
  activities: string[];
  destinationLabel?: string;
  region?: PlanRegionContext;
  /** Wszystkie atrakcje do wyboru na mapie (nie tylko preselekcja klastra). */
  attractionPool: AttractionWithActivities[];
  selectedAttractionIds?: string[];
  lodgingBase?: {
    lat: number;
    lon: number;
    name: string;
    choice: LodgingBaseChoice;
  };
  planComplete?: boolean;
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
    const parsed = JSON.parse(raw) as DestinationBuildPayload;
    if (!parsed.attractionPool) {
      parsed.attractionPool = parsed.cluster?.attractions ?? [];
    }
    return parsed;
  } catch {
    return null;
  }
}

export function applyPlanToCluster(
  payload: DestinationBuildPayload,
): GeoCluster {
  const base = payload.lodgingBase;
  const selected = payload.attractionPool.filter((a) =>
    payload.selectedAttractionIds?.includes(a.id),
  );

  const attractions =
    selected.length > 0 ? selected : payload.cluster.attractions;

  return {
    ...payload.cluster,
    center: base
      ? { lat: base.lat, lon: base.lon }
      : payload.cluster.center,
    settlement: base
      ? {
          name: base.name,
          lat: base.lat,
          lon: base.lon,
        }
      : payload.cluster.settlement,
    attractions,
  };
}

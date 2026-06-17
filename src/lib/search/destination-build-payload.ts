import type { GeoCluster } from "@/types/domain";
import type { AttractionWithActivities } from "@/types/domain";
import type { ActivityRoute } from "@/types/activities";
import type { LodgingBaseChoice } from "@/lib/plan/lodging-base-options";
import type { DiscoverPlacesResult } from "@/lib/plan/build-discover-places";

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
    areaId?: string;
  };
  /** Lotniska destynacji — odległości na kroku bazy noclegowej */
  airports?: Array<{
    iata_code: string;
    name: string;
    lat: number;
    lon: number;
  }>;
  planComplete?: boolean;
  /** Po enrich z /api/search/plan-pool — surowy pool bez metadanych od bazy. */
  poolEnriched?: boolean;
  /** @deprecated Sugestie liczone w wizardzie po wyborze bazy. */
  suggestedAttractionIds?: string[];
  touristRegionId?: string | null;
  touristRegionIds?: string[];
  explorationScope?: string | null;
  /** Promień rejonu z kroku wyszukiwania (suwak „Promień jednego rejonu”). */
  stayRadiusKm?: number;
  exploreRadiusKm?: number;
  tripDays?: number;
  /** Wybrane trasy rowerowe (moduł kolarstwa). */
  selectedCyclingRoutes?: ActivityRoute[];
  /** Plan rowerowy — logika tras, plaż i baz. */
  isCycling?: boolean;
  hasRentalCar?: boolean;
  /** Hero + karty miejsc z /api/search/plan-pool */
  discover?: DiscoverPlacesResult;
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

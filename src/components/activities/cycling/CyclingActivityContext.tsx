"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ActivityRoute } from "@/types/activities";
import type { CyclingRegionCenter, CyclingRouteFilters } from "@/lib/activities/cycling/types";
import {
  beachesRelevantToRoutes,
  rankRoutesForBeaches,
  routeBeachHints,
  type RouteBeachProximity,
} from "@/lib/plan/cycling-plan";
import { dedupeCyclingRoutes } from "@/lib/activities/cycling/route-dedup";
import type { AttractionWithActivities } from "@/types/domain";
import {
  BATCH_ROUTE_COUNT,
  DEFAULT_DESTINATION_RADIUS_KM,
  DEFAULT_REGION_RADIUS_KM,
  INITIAL_DESTINATION_ROUTE_COUNT,
} from "@/lib/activities/cycling/generate-batch";
import {
  buildRegionBatchTargets,
} from "@/lib/activities/cycling/route-distribution";
import {
  isPlausibleStoredRoute,
  isPlausibleStoredRouteForRegions,
} from "@/lib/activities/cycling/route-validation";
import {
  buildRoutesQueryParams,
  parseRouteGeometry,
} from "@/lib/supabase/activity-routes";

const ROUTES_FETCH_LIMIT = 50;

type GenerateRouteOptions = {
  count?: number;
  mode?: "destination" | "regions";
};

type CyclingActivityContextValue = {
  destinationId: string;
  filters: CyclingRouteFilters;
  setFilters: (next: CyclingRouteFilters) => void;
  routes: ActivityRoute[];
  loading: boolean;
  error: string | null;
  selectedRouteId: string | null;
  setSelectedRouteId: (id: string | null) => void;
  planRouteIds: Set<string>;
  togglePlanRoute: (route: ActivityRoute) => void;
  showCyclOsm: boolean;
  setShowCyclOsm: (value: boolean) => void;
  refreshRoutes: (options?: { silent?: boolean }) => Promise<ActivityRoute[]>;
  generateRoutes: (options?: GenerateRouteOptions) => Promise<void>;
  generating: boolean;
  generatingCount: number;
  routePaths: Array<{ id: string; path: Array<{ lat: number; lng: number }> }>;
  routeCenter: { lat: number; lng: number } | null;
  regionRadiusKm: number;
  regionCenters: CyclingRegionCenter[];
  regionBatchSummary: string | null;
  routeBeachHints: Map<string, RouteBeachProximity>;
  hasBeachFocus: boolean;
};

const CyclingActivityContext = createContext<CyclingActivityContextValue | null>(
  null,
);

function filterPlausibleRoutes(
  routes: ActivityRoute[],
  center: { lat: number; lng: number } | null | undefined,
  maxRadiusKm: number,
  regionCenters: CyclingRegionCenter[] = [],
): ActivityRoute[] {
  if (regionCenters.length > 1) {
    const regions = regionCenters.map((region) => ({
      lat: region.lat,
      lng: region.lng,
      radiusKm: region.radiusKm ?? maxRadiusKm,
    }));
    return routes.filter((route) => {
      const path = parseRouteGeometry(route.geometry);
      return isPlausibleStoredRouteForRegions(route.distance_m, path, regions);
    });
  }

  if (!center) return routes;
  return routes.filter((route) => {
    const path = parseRouteGeometry(route.geometry);
    return isPlausibleStoredRoute(
      route.distance_m,
      path,
      center.lat,
      center.lng,
      maxRadiusKm,
    );
  });
}

export function CyclingActivityProvider({
  destinationId,
  destinationCenter,
  destinationLabel,
  regionCenter,
  regionCenters = [],
  beachAttractions = [],
  regionRadiusKm = DEFAULT_REGION_RADIUS_KM,
  defaultShowCyclOsm = false,
  planRouteIds: controlledPlanRouteIds,
  onTogglePlanRoute,
  children,
}: {
  destinationId: string;
  destinationCenter?: { lat: number; lng: number } | null;
  destinationLabel?: string;
  regionCenter?: { lat: number; lng: number } | null;
  regionCenters?: CyclingRegionCenter[];
  beachAttractions?: AttractionWithActivities[];
  regionRadiusKm?: number;
  defaultShowCyclOsm?: boolean;
  planRouteIds?: Set<string>;
  onTogglePlanRoute?: (route: ActivityRoute) => void;
  children: ReactNode;
}) {
  const [filters, setFilters] = useState<CyclingRouteFilters>({});
  const [routes, setRoutes] = useState<ActivityRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [internalPlanRouteIds, setInternalPlanRouteIds] = useState<Set<string>>(
    new Set(),
  );
  const [showCyclOsm, setShowCyclOsm] = useState(defaultShowCyclOsm);
  const [generating, setGenerating] = useState(false);
  const [generatingCount, setGeneratingCount] = useState(0);
  const [regionBatchSummary, setRegionBatchSummary] = useState<string | null>(
    null,
  );
  const seededDestinationRef = useRef<string | null>(null);
  const scrapeStartedRef = useRef(false);
  const komootScrapeStartedRef = useRef(false);

  const planRouteIds = controlledPlanRouteIds ?? internalPlanRouteIds;

  const routeCenter = useMemo(
    () => regionCenter ?? destinationCenter ?? null,
    [regionCenter, destinationCenter],
  );

  const resolvedRegionCenters = useMemo(
    () =>
      regionCenters.length > 0
        ? regionCenters
        : regionCenter
          ? [{ lat: regionCenter.lat, lng: regionCenter.lng, radiusKm: regionRadiusKm }]
          : [],
    [regionCenters, regionCenter, regionRadiusKm],
  );

  const refreshRoutes = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError(null);
    try {
      const useGeoFilter =
        resolvedRegionCenters.length === 1 && routeCenter != null;
      const params = buildRoutesQueryParams(
        destinationId,
        filters,
        ROUTES_FETCH_LIMIT,
        useGeoFilter && routeCenter
          ? {
              lat: routeCenter.lat,
              lng: routeCenter.lng,
              radiusKm:
                resolvedRegionCenters[0]?.radiusKm ?? regionRadiusKm,
            }
          : undefined,
      );
      const res = await fetch(`/api/activities/cycling/routes?${params}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string | { formErrors?: string[] };
        };
        const errText =
          typeof body.error === "string"
            ? body.error
            : JSON.stringify(body.error ?? "Nie udało się pobrać tras");
        throw new Error(errText);
      }
      const data = (await res.json()) as { routes: ActivityRoute[] };
      const nextRoutes = dedupeCyclingRoutes(
        filterPlausibleRoutes(
          data.routes ?? [],
          routeCenter,
          resolvedRegionCenters.length === 1
            ? (resolvedRegionCenters[0]?.radiusKm ?? regionRadiusKm)
            : DEFAULT_DESTINATION_RADIUS_KM,
          resolvedRegionCenters,
        ),
      );
      setRoutes(nextRoutes);
      return nextRoutes;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Błąd pobierania tras";
      const hint =
        message.includes("activity_routes") || message.includes("does not exist")
          ? " — uruchom migrację 021_activities_module.sql w Supabase"
          : "";
      setError(message + hint);
      setRoutes([]);
      return [];
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [destinationId, filters, routeCenter, regionRadiusKm, resolvedRegionCenters]);

  const runKomootScrapeInBackground = useCallback(() => {
    if (komootScrapeStartedRef.current || !routeCenter) return;
    komootScrapeStartedRef.current = true;
    void fetch("/api/activities/cycling/scrape-komoot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destinationId,
        centerLat: routeCenter.lat,
        centerLng: routeCenter.lng,
        radiusKm: regionRadiusKm,
        destinationLabel,
      }),
    })
      .then(() => refreshRoutes({ silent: true }))
      .catch(() => null);
  }, [destinationId, destinationLabel, refreshRoutes, routeCenter, regionRadiusKm]);

  const runOsmScrapeInBackground = useCallback(() => {
    if (scrapeStartedRef.current) return;

    const scrapeTargets =
      resolvedRegionCenters.length > 0
        ? resolvedRegionCenters.map((region) => ({
            centerLat: region.lat,
            centerLng: region.lng,
            radiusKm: region.radiusKm ?? regionRadiusKm,
          }))
        : routeCenter
          ? [
              {
                centerLat: routeCenter.lat,
                centerLng: routeCenter.lng,
                radiusKm: regionRadiusKm,
              },
            ]
          : [];

    if (scrapeTargets.length === 0) return;
    scrapeStartedRef.current = true;

    void Promise.all(
      scrapeTargets.map((target) =>
        fetch("/api/activities/cycling/scrape-osm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destinationId,
            centerLat: target.centerLat,
            centerLng: target.centerLng,
            radiusKm: target.radiusKm,
          }),
        }),
      ),
    )
      .then(() => refreshRoutes({ silent: true }))
      .catch(() => null);
    runKomootScrapeInBackground();
  }, [
    destinationId,
    refreshRoutes,
    resolvedRegionCenters,
    routeCenter,
    regionRadiusKm,
    runKomootScrapeInBackground,
  ]);

  const fetchAllRouteCount = useCallback(async () => {
    const params = new URLSearchParams({
      destinationId,
      limit: String(ROUTES_FETCH_LIMIT),
    });
    const res = await fetch(`/api/activities/cycling/routes?${params}`);
    if (!res.ok) return 0;
    const data = (await res.json()) as { routes: ActivityRoute[] };
    return (data.routes ?? []).length;
  }, [destinationId]);

  const generateRoutes = useCallback(
    async (options?: GenerateRouteOptions) => {
      const destCenter = destinationCenter ?? routeCenter;
      if (!destCenter) {
        setError("Brak współrzędnych — nie można wygenerować tras.");
        return;
      }

      const mode = options?.mode ?? "regions";
      const totalCount = options?.count ?? BATCH_ROUTE_COUNT;
      const presetStartIndex = routes.length;

      let regionsPayload: Array<{
        centerLat: number;
        centerLng: number;
        count: number;
        maxRadiusKm: number;
        label?: string;
      }> = [];
      let summary: string | null = null;

      if (mode === "regions" && resolvedRegionCenters.length > 0) {
        const targets = buildRegionBatchTargets(
          resolvedRegionCenters.map((r) => ({
            centerLat: r.lat,
            centerLng: r.lng,
            maxRadiusKm: r.radiusKm ?? regionRadiusKm,
            label: r.label,
          })),
          totalCount,
        );
        regionsPayload = targets.map((t) => ({
          centerLat: t.centerLat,
          centerLng: t.centerLng,
          count: t.count,
          maxRadiusKm: t.maxRadiusKm ?? regionRadiusKm,
          label: t.label,
        }));
        summary = targets
          .map((t) => (t.label && t.count > 0 ? `${t.label}: ${t.count}` : null))
          .filter(Boolean)
          .join(" · ");
      } else {
        regionsPayload = [
          {
            centerLat: destCenter.lat,
            centerLng: destCenter.lng,
            count: totalCount,
            maxRadiusKm: DEFAULT_DESTINATION_RADIUS_KM,
          },
        ];
      }

      setGenerating(true);
      setGeneratingCount(regionsPayload.reduce((sum, r) => sum + r.count, 0));
      setRegionBatchSummary(summary);
      setError(null);
      try {
        const res = await fetch("/api/activities/cycling/generate-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destinationId,
            regions: regionsPayload,
            presetStartIndex,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(
            typeof body.error === "string"
              ? body.error
              : "Generowanie tras nie powiodło się",
          );
        }
        await refreshRoutes({ silent: true });
        runOsmScrapeInBackground();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Błąd generowania tras");
      } finally {
        setGenerating(false);
        setGeneratingCount(0);
      }
    },
    [
      destinationId,
      destinationCenter,
      refreshRoutes,
      regionRadiusKm,
      resolvedRegionCenters,
      routeCenter,
      routes.length,
      runOsmScrapeInBackground,
    ],
  );

  const ensureInitialRoutes = useCallback(async () => {
    if (seededDestinationRef.current === destinationId) return;
    if (!destinationCenter && !routeCenter) return;

    seededDestinationRef.current = destinationId;

    await refreshRoutes();
    runOsmScrapeInBackground();

    const totalInDb = await fetchAllRouteCount();
    if (totalInDb >= INITIAL_DESTINATION_ROUTE_COUNT) return;

    await generateRoutes({
      count: INITIAL_DESTINATION_ROUTE_COUNT,
      mode: resolvedRegionCenters.length > 1 ? "regions" : "destination",
    });
  }, [
    destinationId,
    destinationCenter,
    routeCenter,
    resolvedRegionCenters.length,
    generateRoutes,
    refreshRoutes,
    fetchAllRouteCount,
    runOsmScrapeInBackground,
  ]);

  const togglePlanRoute = useCallback(
    (route: ActivityRoute) => {
      if (onTogglePlanRoute) {
        onTogglePlanRoute(route);
        return;
      }
      setInternalPlanRouteIds((prev) => {
        const next = new Set(prev);
        if (next.has(route.id)) next.delete(route.id);
        else next.add(route.id);
        return next;
      });
    },
    [onTogglePlanRoute],
  );

  const relevantBeaches = useMemo(
    () => beachesRelevantToRoutes(routes, beachAttractions),
    [routes, beachAttractions],
  );

  const displayRoutes = useMemo(
    () =>
      relevantBeaches.length > 0
        ? rankRoutesForBeaches(routes, relevantBeaches)
        : routes,
    [routes, relevantBeaches],
  );

  const routePaths = useMemo(
    () =>
      displayRoutes.map((route) => ({
        id: route.id,
        path: parseRouteGeometry(route.geometry),
      })),
    [displayRoutes],
  );

  const beachHints = useMemo(
    () => routeBeachHints(displayRoutes, relevantBeaches),
    [displayRoutes, relevantBeaches],
  );

  useEffect(() => {
    seededDestinationRef.current = null;
    scrapeStartedRef.current = false;
    komootScrapeStartedRef.current = false;
    let cancelled = false;
    void (async () => {
      await refreshRoutes();
      if (!cancelled) await ensureInitialRoutes();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationId, destinationCenter?.lat, destinationCenter?.lng, routeCenter?.lat, routeCenter?.lng, regionRadiusKm, resolvedRegionCenters.length]);

  const value = useMemo(
    () => ({
      destinationId,
      filters,
      setFilters,
      routes: displayRoutes,
      loading,
      error,
      selectedRouteId,
      setSelectedRouteId,
      planRouteIds,
      togglePlanRoute,
      showCyclOsm,
      setShowCyclOsm,
      refreshRoutes,
      generateRoutes,
      generating,
      generatingCount,
      routePaths,
      routeCenter,
      regionRadiusKm,
      regionCenters: resolvedRegionCenters,
      regionBatchSummary,
      routeBeachHints: beachHints,
      hasBeachFocus: beachHints.size > 0,
    }),
    [
      destinationId,
      filters,
      displayRoutes,
      loading,
      error,
      selectedRouteId,
      planRouteIds,
      showCyclOsm,
      refreshRoutes,
      generateRoutes,
      generating,
      generatingCount,
      routePaths,
      routeCenter,
      regionRadiusKm,
      resolvedRegionCenters,
      regionBatchSummary,
      beachHints,
      relevantBeaches.length,
      togglePlanRoute,
    ],
  );

  return (
    <CyclingActivityContext.Provider value={value}>
      {children}
    </CyclingActivityContext.Provider>
  );
}

export function useCyclingActivity() {
  const ctx = useContext(CyclingActivityContext);
  if (!ctx) {
    throw new Error("useCyclingActivity must be used within CyclingActivityProvider");
  }
  return ctx;
}

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
import type { CyclingRouteFilters } from "@/lib/activities/cycling/types";
import {
  BATCH_ROUTE_COUNT,
  DEFAULT_REGION_RADIUS_KM,
} from "@/lib/activities/cycling/generate-batch";
import { isPlausibleStoredRoute } from "@/lib/activities/cycling/route-validation";
import {
  buildRoutesQueryParams,
  parseRouteGeometry,
} from "@/lib/supabase/activity-routes";

const MIN_INITIAL_ROUTES = 10;
const ROUTES_FETCH_LIMIT = 40;

type GenerateRouteOptions = {
  count?: number;
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
};

const CyclingActivityContext = createContext<CyclingActivityContextValue | null>(
  null,
);

function filterPlausibleRoutes(
  routes: ActivityRoute[],
  center: { lat: number; lng: number } | null | undefined,
  maxRadiusKm: number,
): ActivityRoute[] {
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
  regionCenter,
  regionRadiusKm = DEFAULT_REGION_RADIUS_KM,
  defaultShowCyclOsm = false,
  planRouteIds: controlledPlanRouteIds,
  onTogglePlanRoute,
  children,
}: {
  destinationId: string;
  destinationCenter?: { lat: number; lng: number } | null;
  regionCenter?: { lat: number; lng: number } | null;
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
  const seededDestinationRef = useRef<string | null>(null);
  const scrapeStartedRef = useRef(false);

  const planRouteIds = controlledPlanRouteIds ?? internalPlanRouteIds;

  const routeCenter = useMemo(
    () => regionCenter ?? destinationCenter ?? null,
    [regionCenter, destinationCenter],
  );

  const refreshRoutes = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError(null);
    try {
      const params = buildRoutesQueryParams(
        destinationId,
        filters,
        ROUTES_FETCH_LIMIT,
        routeCenter
          ? {
              lat: routeCenter.lat,
              lng: routeCenter.lng,
              radiusKm: regionRadiusKm,
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
      const nextRoutes = filterPlausibleRoutes(
        data.routes ?? [],
        routeCenter,
        regionRadiusKm,
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
  }, [destinationId, filters, routeCenter, regionRadiusKm]);

  const runOsmScrapeInBackground = useCallback(() => {
    if (scrapeStartedRef.current || !routeCenter) return;
    scrapeStartedRef.current = true;
    void fetch("/api/activities/cycling/scrape-osm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destinationId,
        centerLat: routeCenter.lat,
        centerLng: routeCenter.lng,
        radiusKm: regionRadiusKm,
      }),
    })
      .then(() => refreshRoutes({ silent: true }))
      .catch(() => null);
  }, [destinationId, refreshRoutes, routeCenter, regionRadiusKm]);

  const generateRoutes = useCallback(
    async (options?: GenerateRouteOptions) => {
      if (!routeCenter) {
        setError("Brak współrzędnych rejonu — nie można wygenerować tras.");
        return;
      }
      const count = options?.count ?? BATCH_ROUTE_COUNT;
      setGenerating(true);
      setGeneratingCount(count);
      setError(null);
      try {
        const res = await fetch("/api/activities/cycling/generate-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destinationId,
            centerLat: routeCenter.lat,
            centerLng: routeCenter.lng,
            count,
            maxRadiusKm: regionRadiusKm,
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
      refreshRoutes,
      regionRadiusKm,
      routeCenter,
      runOsmScrapeInBackground,
    ],
  );

  const ensureInitialRoutes = useCallback(async () => {
    if (seededDestinationRef.current === destinationId) return;
    if (!routeCenter) return;

    seededDestinationRef.current = destinationId;

    const current = await refreshRoutes();
    runOsmScrapeInBackground();

    if (current.length >= MIN_INITIAL_ROUTES) return;

    await generateRoutes({ count: BATCH_ROUTE_COUNT });
  }, [
    destinationId,
    generateRoutes,
    refreshRoutes,
    routeCenter,
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

  const routePaths = useMemo(
    () =>
      routes.map((route) => ({
        id: route.id,
        path: parseRouteGeometry(route.geometry),
      })),
    [routes],
  );

  useEffect(() => {
    seededDestinationRef.current = null;
    scrapeStartedRef.current = false;
    let cancelled = false;
    void (async () => {
      await refreshRoutes();
      if (!cancelled) await ensureInitialRoutes();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationId, routeCenter?.lat, routeCenter?.lng, regionRadiusKm]);

  const value = useMemo(
    () => ({
      destinationId,
      filters,
      setFilters,
      routes,
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
    }),
    [
      destinationId,
      filters,
      routes,
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

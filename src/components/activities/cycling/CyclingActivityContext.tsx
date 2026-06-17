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
import type { ActivityRoute, ActivityType } from "@/types/activities";
import type { CyclingRouteFilters } from "@/lib/activities/cycling/types";
import { isPlausibleStoredRoute } from "@/lib/activities/cycling/route-validation";
import {
  buildRoutesQueryParams,
  parseRouteGeometry,
} from "@/lib/supabase/activity-routes";

const MIN_INITIAL_ROUTES = 20;
const ROUTES_FETCH_LIMIT = 50;

const INITIAL_ROUTE_PRESETS: Array<{
  targetDistanceKm: number;
  activityType: ActivityType;
}> = [
  { targetDistanceKm: 22, activityType: "cycling_road" },
  { targetDistanceKm: 28, activityType: "cycling_road" },
  { targetDistanceKm: 35, activityType: "cycling_road" },
  { targetDistanceKm: 42, activityType: "cycling_road" },
  { targetDistanceKm: 50, activityType: "cycling_road" },
  { targetDistanceKm: 58, activityType: "cycling_road" },
  { targetDistanceKm: 30, activityType: "cycling_gravel" },
  { targetDistanceKm: 38, activityType: "cycling_gravel" },
  { targetDistanceKm: 45, activityType: "cycling_gravel" },
  { targetDistanceKm: 55, activityType: "cycling_gravel" },
  { targetDistanceKm: 25, activityType: "cycling_mtb" },
  { targetDistanceKm: 32, activityType: "cycling_mtb" },
  { targetDistanceKm: 40, activityType: "cycling_mtb" },
  { targetDistanceKm: 35, activityType: "cycling_ebike" },
  { targetDistanceKm: 48, activityType: "cycling_ebike" },
  { targetDistanceKm: 60, activityType: "cycling_ebike" },
  { targetDistanceKm: 65, activityType: "cycling_road" },
  { targetDistanceKm: 72, activityType: "cycling_gravel" },
  { targetDistanceKm: 80, activityType: "cycling_road" },
  { targetDistanceKm: 90, activityType: "cycling_touring" },
];

type GenerateRouteOptions = {
  targetDistanceKm?: number;
  activityType?: ActivityType;
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
  refreshRoutes: () => Promise<ActivityRoute[]>;
  generateRoute: (options?: GenerateRouteOptions) => Promise<void>;
  ensureInitialRoutes: () => Promise<void>;
  generating: boolean;
  routePaths: Array<{ id: string; path: Array<{ lat: number; lng: number }> }>;
  destinationCenter: { lat: number; lng: number } | null;
};

const CyclingActivityContext = createContext<CyclingActivityContextValue | null>(
  null,
);

function filterPlausibleRoutes(
  routes: ActivityRoute[],
  center: { lat: number; lng: number } | null | undefined,
): ActivityRoute[] {
  if (!center) return routes;
  return routes.filter((route) => {
    const path = parseRouteGeometry(route.geometry);
    return isPlausibleStoredRoute(route.distance_m, path, center.lat, center.lng);
  });
}

export function CyclingActivityProvider({
  destinationId,
  destinationCenter,
  defaultShowCyclOsm = false,
  planRouteIds: controlledPlanRouteIds,
  onTogglePlanRoute,
  children,
}: {
  destinationId: string;
  destinationCenter?: { lat: number; lng: number } | null;
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
  const seededDestinationRef = useRef<string | null>(null);

  const planRouteIds = controlledPlanRouteIds ?? internalPlanRouteIds;

  const refreshRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildRoutesQueryParams(
        destinationId,
        filters,
        ROUTES_FETCH_LIMIT,
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
        destinationCenter,
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
      setLoading(false);
    }
  }, [destinationId, destinationCenter, filters]);

  const generateRoute = useCallback(
    async (options?: GenerateRouteOptions) => {
      if (!destinationCenter) {
        setError("Brak współrzędnych destynacji — nie można wygenerować trasy.");
        return;
      }
      setGenerating(true);
      setError(null);
      try {
        const res = await fetch("/api/activities/cycling/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destinationId,
            startLat: destinationCenter.lat,
            startLng: destinationCenter.lng,
            targetDistanceKm: options?.targetDistanceKm ?? 45,
            activityType: options?.activityType ?? "cycling_road",
            loop: true,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(
            typeof body.error === "string"
              ? body.error
              : "Generowanie trasy nie powiodło się",
          );
        }
        await refreshRoutes();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Błąd generowania trasy");
      } finally {
        setGenerating(false);
      }
    },
    [destinationCenter, destinationId, refreshRoutes],
  );

  const ensureInitialRoutes = useCallback(async () => {
    if (seededDestinationRef.current === destinationId) return;
    if (!destinationCenter) return;

    seededDestinationRef.current = destinationId;
    setGenerating(true);
    setError(null);

    try {
      await fetch("/api/activities/cycling/scrape-osm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationId }),
      }).catch(() => null);

      let current = await refreshRoutes();

      const presets = INITIAL_ROUTE_PRESETS.slice(
        0,
        Math.max(0, MIN_INITIAL_ROUTES - current.length),
      );

      for (const preset of presets) {
        if (current.length >= MIN_INITIAL_ROUTES) break;
        const res = await fetch("/api/activities/cycling/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destinationId,
            startLat: destinationCenter.lat,
            startLng: destinationCenter.lng,
            targetDistanceKm: preset.targetDistanceKm,
            activityType: preset.activityType,
            loop: true,
          }),
        });
        if (res.ok) {
          current = await refreshRoutes();
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd generowania tras");
    } finally {
      setGenerating(false);
    }
  }, [destinationCenter, destinationId, refreshRoutes]);

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
    let cancelled = false;
    void (async () => {
      await refreshRoutes();
      if (!cancelled) await ensureInitialRoutes();
    })();
    return () => {
      cancelled = true;
    };
    // Seed once per destination; filter changes refresh via CyclingFilters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationId]);

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
      generateRoute,
      ensureInitialRoutes,
      generating,
      routePaths,
      destinationCenter: destinationCenter ?? null,
    }),
    [
      destinationId,
      destinationCenter,
      filters,
      routes,
      loading,
      error,
      selectedRouteId,
      planRouteIds,
      showCyclOsm,
      refreshRoutes,
      generateRoute,
      ensureInitialRoutes,
      generating,
      routePaths,
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

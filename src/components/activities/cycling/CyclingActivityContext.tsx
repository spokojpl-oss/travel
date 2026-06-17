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
import {
  buildRoutesQueryParams,
  parseRouteGeometry,
} from "@/lib/supabase/activity-routes";

const MIN_INITIAL_ROUTES = 8;

const INITIAL_ROUTE_PRESETS: Array<{
  targetDistanceKm: number;
  activityType: ActivityType;
}> = [
  { targetDistanceKm: 25, activityType: "cycling_road" },
  { targetDistanceKm: 35, activityType: "cycling_road" },
  { targetDistanceKm: 45, activityType: "cycling_road" },
  { targetDistanceKm: 55, activityType: "cycling_gravel" },
  { targetDistanceKm: 40, activityType: "cycling_gravel" },
  { targetDistanceKm: 30, activityType: "cycling_mtb" },
  { targetDistanceKm: 50, activityType: "cycling_ebike" },
  { targetDistanceKm: 65, activityType: "cycling_road" },
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
  togglePlanRoute: (id: string) => void;
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

export function CyclingActivityProvider({
  destinationId,
  destinationCenter,
  defaultShowCyclOsm = false,
  children,
}: {
  destinationId: string;
  destinationCenter?: { lat: number; lng: number } | null;
  defaultShowCyclOsm?: boolean;
  children: ReactNode;
}) {
  const [filters, setFilters] = useState<CyclingRouteFilters>({});
  const [routes, setRoutes] = useState<ActivityRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [planRouteIds, setPlanRouteIds] = useState<Set<string>>(new Set());
  const [showCyclOsm, setShowCyclOsm] = useState(defaultShowCyclOsm);
  const [generating, setGenerating] = useState(false);
  const seededDestinationRef = useRef<string | null>(null);

  const refreshRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildRoutesQueryParams(destinationId, filters, 30);
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
      const nextRoutes = data.routes ?? [];
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
  }, [destinationId, filters]);

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
      let current = await refreshRoutes();
      const presets = INITIAL_ROUTE_PRESETS.slice(
        0,
        Math.max(0, MIN_INITIAL_ROUTES - current.length),
      );

      for (const preset of presets) {
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

  const togglePlanRoute = useCallback((id: string) => {
    setPlanRouteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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

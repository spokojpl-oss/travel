"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ActivityRoute } from "@/types/activities";
import type { CyclingRouteFilters } from "@/lib/activities/cycling/types";
import {
  buildRoutesQueryParams,
  parseRouteGeometry,
} from "@/lib/supabase/activity-routes";

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
  refreshRoutes: () => Promise<void>;
  generateRoute: () => Promise<void>;
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
  children,
}: {
  destinationId: string;
  destinationCenter?: { lat: number; lng: number } | null;
  children: ReactNode;
}) {
  const [filters, setFilters] = useState<CyclingRouteFilters>({});
  const [routes, setRoutes] = useState<ActivityRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [planRouteIds, setPlanRouteIds] = useState<Set<string>>(new Set());
  const [showCyclOsm, setShowCyclOsm] = useState(false);

  const [generating, setGenerating] = useState(false);

  const refreshRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildRoutesQueryParams(destinationId, filters);
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
      setRoutes(data.routes ?? []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Błąd pobierania tras";
      const hint =
        message.includes("activity_routes") || message.includes("does not exist")
          ? " — uruchom migrację 021_activities_module.sql w Supabase"
          : "";
      setError(message + hint);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [destinationId, filters]);

  const togglePlanRoute = useCallback((id: string) => {
    setPlanRouteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const generateRoute = useCallback(async () => {
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
          targetDistanceKm: 45,
          activityType: "cycling_road",
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
  }, [destinationCenter, destinationId, refreshRoutes]);

  const routePaths = useMemo(
    () =>
      routes.map((route) => ({
        id: route.id,
        path: parseRouteGeometry(route.geometry),
      })),
    [routes],
  );

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

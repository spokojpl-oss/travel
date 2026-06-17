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
  buildTerrainAwareTopUpTargets,
  expandRegionTargetsWithTerrain,
  inlandScrapeCentersFromRegions,
} from "@/lib/activities/cycling/route-terrain";
import {
  formatRegionBatchSummary,
} from "@/lib/activities/cycling/region-route-balance";
import {
  isPlausibleStoredRoute,
  isPlausibleStoredRouteForRegions,
} from "@/lib/activities/cycling/route-validation";
import {
  buildRoutesQueryParams,
  parseRouteGeometry,
} from "@/lib/supabase/activity-routes";
import { distanceKm } from "@/lib/search/geo-clustering";
import type { GeoPoint } from "@/types/domain";

const ROUTES_FETCH_LIMIT = 50;

type GenerateRouteOptions = {
  count?: number;
  mode?: "destination" | "regions";
  /** Uzupełnij tylko brakujące trasy w rejonach (startowy seed). */
  topUpOnly?: boolean;
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

  const beachPoints = useMemo(
    (): GeoPoint[] =>
      beachAttractions.map((a) => ({
        lat: Number(a.lat),
        lon: Number(a.lon),
      })),
    [beachAttractions],
  );

  const beachesByRegion = useMemo(() => {
    const map = new Map<string, GeoPoint[]>();
    for (const region of resolvedRegionCenters) {
      const key = region.label ?? `${region.lat},${region.lng}`;
      map.set(
        key,
        beachPoints.filter(
          (b) =>
            distanceKm(b, { lat: region.lat, lon: region.lng }) <=
            (region.radiusKm ?? regionRadiusKm) + 6,
        ),
      );
    }
    return map;
  }, [resolvedRegionCenters, beachPoints, regionRadiusKm]);

  const refreshRoutes = useCallback(async (options?: { silent?: boolean }) => {
    const t0 = Date.now();
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/173647fd-e041-4dc5-8254-79e68a12fc0f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d400df'},body:JSON.stringify({sessionId:'d400df',runId:'pre-fix',hypothesisId:'H2',location:'CyclingActivityContext.tsx:refreshRoutes:start',message:'refreshRoutes started',data:{silent:Boolean(options?.silent),destinationId},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/173647fd-e041-4dc5-8254-79e68a12fc0f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d400df'},body:JSON.stringify({sessionId:'d400df',runId:'pre-fix',hypothesisId:'H2',location:'CyclingActivityContext.tsx:refreshRoutes:done',message:'refreshRoutes finished',data:{count:nextRoutes.length,elapsedMs:Date.now()-t0,silent:Boolean(options?.silent)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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

    const coastalTargets =
      resolvedRegionCenters.length > 0
        ? resolvedRegionCenters.map((region) => ({
            centerLat: region.lat,
            centerLng: region.lng,
            radiusKm: region.radiusKm ?? regionRadiusKm,
          }))
        : [
            {
              centerLat: routeCenter.lat,
              centerLng: routeCenter.lng,
              radiusKm: regionRadiusKm,
            },
          ];

    const inlandTargets =
      resolvedRegionCenters.length > 0
        ? inlandScrapeCentersFromRegions(resolvedRegionCenters, beachPoints).map(
            (inland) => ({
              centerLat: inland.lat,
              centerLng: inland.lng,
              radiusKm: Math.round(inland.radiusKm * 0.85),
            }),
          )
        : [];

    void Promise.all([
      ...coastalTargets.map((target) =>
        fetch("/api/activities/cycling/scrape-komoot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destinationId,
            centerLat: target.centerLat,
            centerLng: target.centerLng,
            radiusKm: target.radiusKm,
            destinationLabel,
            maxTours: 10,
          }),
        }),
      ),
      ...inlandTargets.map((target) =>
        fetch("/api/activities/cycling/scrape-komoot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destinationId,
            centerLat: target.centerLat,
            centerLng: target.centerLng,
            radiusKm: target.radiusKm,
            destinationLabel,
            maxTours: 6,
          }),
        }),
      ),
    ])
      .then(() => refreshRoutes({ silent: true }))
      .catch(() => null);
  }, [
    destinationId,
    destinationLabel,
    refreshRoutes,
    routeCenter,
    regionRadiusKm,
    resolvedRegionCenters,
    beachPoints,
  ]);

  const runOsmScrapeInBackground = useCallback(() => {
    if (scrapeStartedRef.current) return;

    const scrapeTargets =
      resolvedRegionCenters.length > 0
        ? [
            ...resolvedRegionCenters.map((region) => ({
              centerLat: region.lat,
              centerLng: region.lng,
              radiusKm: region.radiusKm ?? regionRadiusKm,
            })),
            ...inlandScrapeCentersFromRegions(
              resolvedRegionCenters,
              beachPoints,
            ).map((inland) => ({
              centerLat: inland.lat,
              centerLng: inland.lng,
              radiusKm: inland.radiusKm,
            })),
          ]
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
    beachPoints,
  ]);

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
        terrain?: "coastal" | "inland";
      }> = [];
      let summary: string | null = null;

      if (mode === "regions" && resolvedRegionCenters.length > 0) {
        const regionInputs = resolvedRegionCenters.map((r) => ({
          centerLat: r.lat,
          centerLng: r.lng,
          maxRadiusKm: r.radiusKm ?? regionRadiusKm,
          label: r.label,
        }));

        const baseTargets =
          options?.topUpOnly === true
            ? buildTerrainAwareTopUpTargets(
                routes,
                resolvedRegionCenters,
                totalCount,
                beachPoints,
              )
            : buildRegionBatchTargets(regionInputs, totalCount);

        const targets = expandRegionTargetsWithTerrain(
          baseTargets,
          beachesByRegion,
        );

        if (targets.length === 0) return;

        regionsPayload = targets.map((t) => ({
          centerLat: t.centerLat,
          centerLng: t.centerLng,
          count: t.count,
          maxRadiusKm: t.maxRadiusKm ?? regionRadiusKm,
          label: t.label,
          terrain: t.terrain,
        }));
        summary = targets
          .map((t) => {
            if (!t.label || t.count <= 0) return null;
            const kind =
              t.terrain === "inland" ? "ląd" : "morze";
            return `${t.label} (${kind}): ${t.count}`;
          })
          .filter(Boolean)
          .join(" · ");
      } else {
        const expanded = expandRegionTargetsWithTerrain(
          [
            {
              centerLat: destCenter.lat,
              centerLng: destCenter.lng,
              count: totalCount,
              maxRadiusKm: DEFAULT_DESTINATION_RADIUS_KM,
            },
          ],
          beachesByRegion,
        );
        regionsPayload = expanded.map((t) => ({
          centerLat: t.centerLat,
          centerLng: t.centerLng,
          count: t.count,
          maxRadiusKm: t.maxRadiusKm ?? DEFAULT_DESTINATION_RADIUS_KM,
          label: t.label,
          terrain: t.terrain,
        }));
      }

      setGenerating(true);
      setGeneratingCount(regionsPayload.reduce((sum, r) => sum + r.count, 0));
      setRegionBatchSummary(summary);
      setError(null);
      const genT0 = Date.now();
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/173647fd-e041-4dc5-8254-79e68a12fc0f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d400df'},body:JSON.stringify({sessionId:'d400df',runId:'pre-fix',hypothesisId:'H1',location:'CyclingActivityContext.tsx:generateRoutes:start',message:'generateRoutes started',data:{totalJobs:regionsPayload.reduce((s,r)=>s+r.count,0),topUpOnly:Boolean(options?.topUpOnly)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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
        const batch = (await res.json()) as {
          created?: number;
          failed?: number;
          regions?: Array<{ label?: string; requested: number; created: number }>;
        };
        const batchSummary = formatRegionBatchSummary(batch.regions ?? []);
        if (batchSummary) setRegionBatchSummary(batchSummary);

        const incomplete = (batch.regions ?? []).filter(
          (region) => region.created < region.requested,
        );
        if (incomplete.length > 0) {
          setError(
            `Wygenerowano ${batch.created ?? 0} tras. Brakuje w: ${incomplete
              .map(
                (region) =>
                  `${region.label ?? "rejon"} (${region.created}/${region.requested})`,
              )
              .join(", ")}.`,
          );
        }

        await refreshRoutes({ silent: true });
        runOsmScrapeInBackground();
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/173647fd-e041-4dc5-8254-79e68a12fc0f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d400df'},body:JSON.stringify({sessionId:'d400df',runId:'pre-fix',hypothesisId:'H1',location:'CyclingActivityContext.tsx:generateRoutes:done',message:'generateRoutes finished',data:{elapsedMs:Date.now()-genT0},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
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
      routes,
      beachPoints,
      beachesByRegion,
      runOsmScrapeInBackground,
    ],
  );

  const ensureInitialRoutes = useCallback(async () => {
    if (seededDestinationRef.current === destinationId) return;
    if (!destinationCenter && !routeCenter) return;

    seededDestinationRef.current = destinationId;
    const t0 = Date.now();
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/173647fd-e041-4dc5-8254-79e68a12fc0f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d400df'},body:JSON.stringify({sessionId:'d400df',runId:'pre-fix',hypothesisId:'H1',location:'CyclingActivityContext.tsx:ensureInitialRoutes:start',message:'ensureInitialRoutes started',data:{destinationId,regionCount:resolvedRegionCenters.length},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    const currentRoutes = await refreshRoutes();
    runOsmScrapeInBackground();

    if (resolvedRegionCenters.length > 1) {
      const topUp = buildTerrainAwareTopUpTargets(
        currentRoutes,
        resolvedRegionCenters,
        INITIAL_DESTINATION_ROUTE_COUNT,
        beachPoints,
      );
      if (topUp.length === 0) return;
      await generateRoutes({
        count: INITIAL_DESTINATION_ROUTE_COUNT,
        mode: "regions",
        topUpOnly: true,
      });
      return;
    }

    if (currentRoutes.length >= INITIAL_DESTINATION_ROUTE_COUNT) {
      const coastalCount = currentRoutes.filter(
        (r) => !/ · ląd\b| · inland\b/i.test(r.name),
      ).length;
      const inlandCount = currentRoutes.length - coastalCount;
      const requiredInland = Math.floor(coastalCount / 2);
      if (inlandCount >= requiredInland) return;
    }

    await generateRoutes({
      count: INITIAL_DESTINATION_ROUTE_COUNT,
      mode: "destination",
    });
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/173647fd-e041-4dc5-8254-79e68a12fc0f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d400df'},body:JSON.stringify({sessionId:'d400df',runId:'pre-fix',hypothesisId:'H1',location:'CyclingActivityContext.tsx:ensureInitialRoutes:done',message:'ensureInitialRoutes finished',data:{elapsedMs:Date.now()-t0,initialCount:currentRoutes.length},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [
    destinationId,
    destinationCenter,
    routeCenter,
    resolvedRegionCenters,
    generateRoutes,
    refreshRoutes,
    runOsmScrapeInBackground,
    beachPoints,
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

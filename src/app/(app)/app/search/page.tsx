"use client";

import { useEffect, useMemo, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLocale, useT } from "@/i18n/locale-provider";
import { RefineInput } from "@/components/features/RefineInput";
import { RegionMap } from "@/components/features/RegionMap";
import { RegionResultCard } from "@/components/features/RegionResultCard";
import {
  SearchStepIndicator,
  TripContextBar,
  type SearchStep,
} from "@/components/features/TripContextBar";
import { TripRhythmStep } from "@/components/features/TripRhythmStep";
import { TouristRegionCards } from "@/components/features/TouristRegionCards";
import type { ScoredTouristRegion } from "@/lib/destinations/tourist-regions";
import {
  defaultRhythmForTrip,
  formatRhythmSummary,
  hasChildrenInPassengers,
  isGroupInRhythm,
  suggestActivitiesFromRhythm,
  type TripRhythm,
} from "@/lib/search/trip-rhythm";
import { buildIslandMapData } from "@/lib/maps/build-island-map";
import { storeDestinationBuildPayload } from "@/lib/search/destination-build-payload";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Breadcrumb, PageContainer } from "@/components/layout/Header";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  defaultTripContext,
  formatTripDateRange,
  formatTravelSummary,
  hasTripParams,
  mergeTripContext,
  matchActivitySlugsFromText,
  resolveDestinationCoords,
  tripContextFromParams,
  tripContextToParams,
  type ExplorationScope,
  type TripContext,
} from "@/lib/search/trip-context";
import { DestinationOverviewPanel } from "@/components/features/DestinationOverviewPanel";
import {
  EXPLORATION_SCOPE_OPTIONS,
  scopeSearchRadii,
} from "@/lib/search/exploration-scope";
import type { DestinationDiscovery } from "@/lib/search/destination-discover";
import { buildFallbackDiscovery } from "@/lib/search/destination-discover";
import type { Activity, ActivityGroup, ActivitySearchResult, GeoCluster } from "@/types/domain";

type TaxonomyResponse = {
  groups: Array<ActivityGroup & { activities: Activity[] }>;
  meta?: { source?: "database" | "fallback"; reason?: string; db_error?: string };
};

type DataStatus = {
  activities: number;
  attractions: number;
  tags: number;
  search_ready: boolean;
  message: string | null;
};

function EmptyResultsCard({
  results,
  trip,
  suggestionsUnverified,
  locale,
  onChangeActivities,
  onChangeScope,
  onSearchLooser,
  t,
}: {
  results: ActivitySearchResult;
  trip: TripContext;
  suggestionsUnverified: boolean;
  locale: "pl" | "en";
  onChangeActivities: () => void;
  onChangeScope: () => void;
  onSearchLooser: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const destination = trip.destination_label ?? trip.destination ?? "";
  const destSuffix = destination ? ` ${destination}` : "";
  const radiusSuffix =
    results.meta?.geo_radius_km_used != null
      ? locale === "en"
        ? ` (up to ${results.meta.geo_radius_km_used} km)`
        : ` (do ${results.meta.geo_radius_km_used} km)`
      : "";

  let body: string;
  if (suggestionsUnverified && results.total_attractions_considered === 0) {
    body = t("search.noRegionsUnverified", { destination: destSuffix.trim() || "—" });
  } else if (results.total_attractions_considered === 0) {
    body = t("search.noRegionsEmptyDb", {
      destination: destSuffix.trim() || "—",
    });
  } else {
    body = t("search.noRegionsClusters", {
      count: results.total_attractions_considered,
    });
  }

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardBody className="space-y-4">
        <div>
          <p className="font-display text-lg font-bold text-text-primary">
            {t("search.noRegionsTitle")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {body}
          </p>
        </div>

        {results.meta && results.total_attractions_considered === 0 && (
          <p className="text-xs text-text-tertiary">
            {t(
              results.meta.osm_filled ? "search.searchMetaOsm" : "search.searchMetaDetail",
              {
                places: results.meta.attractions_in_bbox,
                tags: results.meta.tag_rows_fetched,
                radius: radiusSuffix,
              },
            )}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={onChangeActivities}>{t("search.changeActivities")}</Button>
          <Button variant="secondary" onClick={onChangeScope}>
            {t("search.changeScope")}
          </Button>
          {results.total_attractions_considered > 0 && (
            <Button variant="ghost" onClick={onSearchLooser}>
              {t("search.searchLooser")}
            </Button>
          )}
        </div>

        {suggestionsUnverified && (
          <p className="text-xs text-text-tertiary">{t("search.adminScrapeHint")}</p>
        )}
      </CardBody>
    </Card>
  );
}

function SearchPageContent() {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<SearchStep>(2);
  const [trip, setTrip] = useState<TripContext>(defaultTripContext);
  const [taxonomy, setTaxonomy] = useState<TaxonomyResponse["groups"]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);
  const [discovery, setDiscovery] = useState<DestinationDiscovery | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [discoveryRetry, setDiscoveryRetry] = useState(0);
  const discoveryCacheKey = useRef<string | null>(null);
  const discoveryFailedKey = useRef<string | null>(null);
  const discoveryFetchInFlight = useRef<string | null>(null);
  const scrollToActivitiesPending = useRef(false);
  const [activityCounts, setActivityCounts] = useState<Record<string, number>>({});
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(
    new Set(),
  );
  const [matchMode, setMatchMode] = useState<"all" | "any">("any");
  const [maxRadius, setMaxRadius] = useState(15);
  const [minPerActivity, setMinPerActivity] = useState(1);
  const [results, setResults] = useState<ActivitySearchResult | null>(null);
  const [showIslandRegions, setShowIslandRegions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [scoredRegions, setScoredRegions] = useState<ScoredTouristRegion[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);

  const activityNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const group of taxonomy) {
      for (const act of group.activities) {
        map[act.slug] = locale === "en" ? act.name_en : act.name_pl;
      }
    }
    return map;
  }, [taxonomy, locale]);

  useEffect(() => {
    if (!hasTripParams(searchParams)) {
      router.replace("/app");
    }
  }, [searchParams, router]);

  useEffect(() => {
    const mountStart = Date.now();
    setPageLoading(true);
    Promise.all([
      fetch("/api/activities/taxonomy").then(async (r) => {
        const data = (await r.json()) as TaxonomyResponse & { error?: string };
        if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
        return data;
      }),
      fetch("/api/activities/status")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([taxonomyData, statusData]) => {
        setTaxonomy(taxonomyData.groups ?? []);
        if (statusData) setDataStatus(statusData as DataStatus);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setPageLoading(false));
  }, []);

  useEffect(() => {
    if (initialized || pageLoading) return;

    const fromUrl = tripContextFromParams(searchParams);
    let merged = mergeTripContext(defaultTripContext(), fromUrl);
    let resolvedStep: SearchStep = 2;

    const restored = sessionStorage.getItem("restore_search_activities");
    if (restored) {
      try {
        const params = JSON.parse(restored) as { activities?: string[] };
        if (params.activities?.length) {
          setSelectedActivities(new Set(params.activities));
          setStep(merged.mode === "destination" ? 6 : 2);
        }
        sessionStorage.removeItem("restore_search_activities");
      } catch {
        /* ignore */
      }
    }

    if (Object.keys(fromUrl).length > 0) {
      merged = mergeTripContext(merged, fromUrl);
      const matched = matchActivitySlugsFromText(
        merged.interests,
        taxonomy,
      );
      if (matched.length > 0) {
        setSelectedActivities(new Set(matched));
      }

      if (merged.mode === "destination") {
        setMatchMode("any");
        const scope = merged.exploration_scope ?? "region";
        setMaxRadius(scopeSearchRadii(scope).max_radius_km);
      }

      const stepParam = searchParams.get("step");
      const parsedStep = stepParam ? Number(stepParam) : 2;
      resolvedStep =
        merged.mode === "destination"
          ? parsedStep >= 2 && parsedStep <= 7
            ? (parsedStep as SearchStep)
            : 2
          : parsedStep >= 3
            ? 3
            : 2;
      setStep(resolvedStep);

      if (
        merged.mode === "destination" &&
        !merged.trip_rhythm &&
        merged.departure_date &&
        resolvedStep >= 4
      ) {
        merged = mergeTripContext(merged, {
          trip_rhythm: defaultRhythmForTrip(
            merged.departure_date,
            merged.return_date,
            { includeKids: hasChildrenInPassengers(merged.passengers) },
          ),
        });
      }
    }

    setTrip(merged);
    setInitialized(true);
  }, [initialized, pageLoading, searchParams, taxonomy]);

  useEffect(() => {
    if (!initialized) return;
    if (searchParams.get("step") === "1") {
      const p = tripContextToParams(trip);
      router.replace(`/app?${p.toString()}#search`);
    }
  }, [initialized, searchParams, trip, router]);

  function editTripOnHome() {
    const p = tripContextToParams(trip);
    router.push(`/app?${p.toString()}#search`);
  }

  useEffect(() => {
    if (!initialized || trip.mode !== "destination") return;
    if (trip.destination_lat != null && trip.destination_lon != null) return;

    const label = trip.destination_label ?? trip.destination ?? "";
    if (label.trim().length < 2) return;

    let cancelled = false;
    resolveDestinationCoords(label).then((coords) => {
      if (cancelled || !coords) return;
      setTrip((t) => ({
        ...t,
        destination_lat: coords.lat,
        destination_lon: coords.lon,
        destination_label: coords.label,
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [
    initialized,
    trip.mode,
    trip.destination_lat,
    trip.destination_lon,
    trip.destination_label,
    trip.destination,
  ]);

  useEffect(() => {
    if (!initialized || trip.mode !== "destination" || step !== 3) return;
    if (trip.destination_lat == null || trip.destination_lon == null) return;
    if (!trip.departure_date) return;

    const label = trip.destination_label ?? trip.destination ?? "";
    const scope = trip.exploration_scope ?? "region";
    const cacheKey = [
      trip.destination_lat,
      trip.destination_lon,
      scope,
      trip.departure_date,
      trip.return_date ?? "",
      label,
      locale,
      trip.passengers,
    ].join("|");

    if (discoveryCacheKey.current === cacheKey) return;
    if (discoveryFailedKey.current === cacheKey) return;
    if (discoveryFetchInFlight.current === cacheKey) return;

    let cancelled = false;
    discoveryFetchInFlight.current = cacheKey;
    setDiscovering(true);
    setDiscovery(null);
    setDiscoveryError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    fetch("/api/search/destination-discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        destination_label: label,
        near_lat: trip.destination_lat,
        near_lon: trip.destination_lon,
        from_date: trip.departure_date,
        to_date: trip.return_date ?? trip.departure_date,
        exploration_scope: scope,
        locale,
        passengers: trip.passengers,
      }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          throw new Error(
            typeof data.error === "string" ? data.error : `HTTP ${r.status}`,
          );
        }
        return data as DestinationDiscovery;
      })
      .then((data) => {
        if (!cancelled) {
          discoveryCacheKey.current = cacheKey;
          discoveryFailedKey.current = null;
          setDiscovery(data);
          setActivityCounts(data.activity_counts);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          const fallback = buildFallbackDiscovery({
            destinationLabel: label,
            explorationScope: scope,
            locale,
            passengers: trip.passengers,
          });
          discoveryCacheKey.current = cacheKey;
          setDiscovery(fallback);
          setDiscoveryError(
            e instanceof Error && e.name === "AbortError"
              ? t("search.discoverWarnSlow")
              : t("search.discoverWarnFallback"),
          );
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (discoveryFetchInFlight.current === cacheKey) {
          discoveryFetchInFlight.current = null;
        }
        if (!cancelled) setDiscovering(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    initialized,
    step,
    trip.mode,
    trip.destination_lat,
    trip.destination_lon,
    trip.destination_label,
    trip.destination,
    trip.departure_date,
    trip.return_date,
    trip.exploration_scope,
    trip.passengers,
    locale,
    discoveryRetry,
    t,
  ]);

  useEffect(() => {
    if (!initialized || trip.mode !== "destination" || step !== 6) return;
    if (Object.keys(activityCounts).length > 0) return;
    if (trip.destination_lat == null || trip.destination_lon == null) return;

    let cancelled = false;
    fetch("/api/search/destination-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        near_lat: trip.destination_lat,
        near_lon: trip.destination_lon,
        exploration_scope: trip.exploration_scope ?? "region",
        destination_label: trip.destination_label ?? trip.destination ?? "",
      }),
    })
      .then((r) => (r.ok ? r.json() : { activity_counts: {} }))
      .then((data: { activity_counts?: Record<string, number> }) => {
        if (!cancelled) setActivityCounts(data.activity_counts ?? {});
      })
      .catch(() => {
        if (!cancelled) setActivityCounts({});
      });

    return () => {
      cancelled = true;
    };
  }, [
    initialized,
    step,
    trip.mode,
    trip.destination_lat,
    trip.destination_lon,
    trip.destination_label,
    trip.destination,
    trip.exploration_scope,
    activityCounts,
  ]);

  function setExplorationScope(scope: ExplorationScope) {
    const radii = scopeSearchRadii(scope);
    setMaxRadius(radii.max_radius_km);
    setTrip((t) => {
      const next = { ...t, exploration_scope: scope };
      syncUrl(next, step);
      return next;
    });
  }

  const isDestinationFlow = trip.mode === "destination";
  const showScopeStep = isDestinationFlow && step === 2;
  const showOverviewStep = isDestinationFlow && step === 3;
  const showRhythmStep = isDestinationFlow && step === 4;
  const showRegionsStep = isDestinationFlow && step === 5;
  const showActivitiesStep = isDestinationFlow ? step === 6 : step === 2;
  const showResultsStep = isDestinationFlow ? step === 7 : step === 3;

  useEffect(() => {
    if (!initialized || !isDestinationFlow || step !== 5 || !trip.trip_rhythm) {
      return;
    }

    const label = trip.destination_label ?? trip.destination ?? "";
    if (!label || !trip.departure_date) return;

    let cancelled = false;
    setRegionsLoading(true);

    fetch("/api/search/tourist-regions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination_label: label,
        from_date: trip.departure_date,
        to_date: trip.return_date ?? trip.departure_date,
        rhythm: trip.trip_rhythm,
      }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          throw new Error(typeof data.error === "string" ? data.error : `HTTP ${r.status}`);
        }
        return data as { regions?: ScoredTouristRegion[] };
      })
      .then((data) => {
        if (!cancelled) setScoredRegions(data.regions ?? []);
      })
      .catch(() => {
        if (!cancelled) setScoredRegions([]);
      })
      .finally(() => {
        if (!cancelled) setRegionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    initialized,
    isDestinationFlow,
    step,
    trip.trip_rhythm,
    trip.destination_label,
    trip.destination,
    trip.departure_date,
    trip.return_date,
  ]);

  const { primaryGroups, optionalGroups } = useMemo(() => {
    if (!trip.trip_rhythm) {
      return { primaryGroups: taxonomy, optionalGroups: [] as typeof taxonomy };
    }
    const primary = taxonomy.filter((g) => isGroupInRhythm(g.slug, trip.trip_rhythm));
    const optional = taxonomy.filter((g) => !isGroupInRhythm(g.slug, trip.trip_rhythm));
    if (primary.length === 0) {
      return { primaryGroups: taxonomy, optionalGroups: [] as typeof taxonomy };
    }
    return { primaryGroups: primary, optionalGroups: optional };
  }, [taxonomy, trip.trip_rhythm]);

  useEffect(() => {
    if (step !== 6 || !scrollToActivitiesPending.current) return;
    scrollToActivitiesPending.current = false;
    document.getElementById("search-activities")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [step]);

  function syncUrl(nextTrip: TripContext, nextStep?: SearchStep) {
    const p = tripContextToParams(nextTrip);
    if (nextStep) p.set("step", String(nextStep));
    router.replace(`/app/search?${p.toString()}`, { scroll: false });
  }

  function updateRhythm(rhythm: TripRhythm) {
    setTrip((prev) => {
      const next = { ...prev, trip_rhythm: rhythm, tourist_region_id: null };
      syncUrl(next, step);
      return next;
    });
    setSelectedActivities(new Set());
  }

  function goToRhythmStep() {
    setStep(4);
    setTrip((prev) => {
      const next = {
        ...prev,
        trip_rhythm:
          prev.trip_rhythm ??
          defaultRhythmForTrip(prev.departure_date, prev.return_date, {
            includeKids: hasChildrenInPassengers(prev.passengers),
          }),
      };
      syncUrl(next, 4);
      return next;
    });
  }

  function goToRegionsStep() {
    setStep(5);
    syncUrl(trip, 5);
  }

  function handleSelectRegion(region: ScoredTouristRegion) {
    const rhythm = trip.trip_rhythm;
    if (!rhythm) return;

    const slugs = suggestActivitiesFromRhythm({
      rhythm,
      counts: activityCounts,
      weather: discovery?.weather ?? null,
      passengers: trip.passengers,
      extraSlugs: region.activity_slugs,
    });
    setSelectedActivities(new Set(slugs));

    setTrip((prev) => {
      const next = {
        ...prev,
        tourist_region_id: region.id,
        destination_lat: region.center_lat,
        destination_lon: region.center_lon,
      };
      syncUrl(next, step);
      return next;
    });
  }

  function goToActivitiesStep() {
    let nextActivities = selectedActivities;
    if (trip.trip_rhythm && selectedActivities.size === 0) {
      nextActivities = new Set(
        suggestActivitiesFromRhythm({
          rhythm: trip.trip_rhythm,
          counts: activityCounts,
          weather: discovery?.weather ?? null,
          passengers: trip.passengers,
        }),
      );
      setSelectedActivities(nextActivities);
    }
    scrollToActivitiesPending.current = true;
    setStep(6);
    syncUrl(trip, 6);
  }

  function goToScopeStep() {
    setStep(2);
    syncUrl(trip, 2);
  }

  function searchLooser() {
    setMatchMode("any");
    setMinPerActivity(1);
    void handleSearch({
      ...getSearchParams(),
      match_mode: "any",
      min_per_activity: 1,
    });
  }

  const suggestionsUnverified = discovery?.suggestions_unverified ?? false;

  function toggleActivity(slug: string) {
    const next = new Set(selectedActivities);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setSelectedActivities(next);
  }

  function getSearchParams() {
    const params: {
      activities: string[];
      match_mode: "all" | "any";
      max_radius_km: number;
      min_per_activity: number;
      near_lat?: number;
      near_lon?: number;
      near_radius_km?: number;
      exploration_scope?: ExplorationScope;
      destination_label?: string;
    } = {
      activities: Array.from(selectedActivities),
      match_mode: matchMode,
      max_radius_km: maxRadius,
      min_per_activity: minPerActivity,
    };

    if (trip.exploration_scope) {
      params.exploration_scope = trip.exploration_scope;
      const radii = scopeSearchRadii(trip.exploration_scope);
      params.max_radius_km = radii.max_radius_km;
    }

    if (
      trip.destination_lat != null &&
      trip.destination_lon != null &&
      Number.isFinite(trip.destination_lat) &&
      Number.isFinite(trip.destination_lon)
    ) {
      params.near_lat = trip.destination_lat;
      params.near_lon = trip.destination_lon;
      params.near_radius_km = trip.exploration_scope
        ? scopeSearchRadii(trip.exploration_scope).near_radius_km
        : trip.mode === "destination"
          ? 150
          : 250;
    }

    if (trip.destination_label) {
      params.destination_label = trip.destination_label;
    }

    return params;
  }

  async function handleSearch(
    overrideParams?: ReturnType<typeof getSearchParams>,
  ) {
    const params = overrideParams ?? getSearchParams();
    if (params.activities.length === 0) {
      return;
    }
    if (!dataStatus?.search_ready) {
      setError(
        dataStatus?.message ?? t("search.dbNotReady"),
      );
      return;
    }
    setIsSearching(true);
    setError(null);
    setResults(null);
    setShowIslandRegions(false);
    setStep(isDestinationFlow ? 7 : 3);
    syncUrl(trip, isDestinationFlow ? 7 : 3);

    const clientStart = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 50000);

      const response = await fetch("/api/search/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Search failed",
        );
      }
      setResults(data as ActivitySearchResult);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setError(t("search.timeout"));
      } else {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    } finally {
      setIsSearching(false);
    }
  }

  function openDestination(cluster: GeoCluster) {
    storeDestinationBuildPayload(cluster.id, {
      cluster,
      activities: Array.from(selectedActivities),
    });
    const tripParams = tripContextToParams(trip);
    tripParams.set("build_id", cluster.id);
    router.push(`/app/destination?${tripParams.toString()}`);
  }

  const dbReady = dataStatus?.search_ready ?? false;
  const missingDestinationCoords =
    trip.mode === "destination" &&
    (trip.destination_lat == null || trip.destination_lon == null) &&
    Boolean(trip.destination_label ?? trip.destination);

  const showDataInfo =
    dataStatus &&
    !dataStatus.search_ready &&
    !pageLoading &&
    (isDestinationFlow ? step >= 6 : step >= 2);

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/app" },
          { label: t("search.breadcrumb") },
        ]}
      />

      <h1 className="font-display mb-2 text-3xl font-bold text-text-primary">
        {showResultsStep
          ? t("search.titleResults")
          : showScopeStep
            ? t("search.titleScope")
            : showOverviewStep
              ? t("search.titleOverview")
              : showRhythmStep
                ? t("search.titleRhythm")
                : showRegionsStep
                  ? t("search.titleRegions")
                  : t("search.titleActivities")}
      </h1>
      <p className="mb-4 text-sm text-text-secondary">
        {showResultsStep
          ? t("search.subtitleResults")
          : showScopeStep
            ? t("search.subtitleScope")
            : showOverviewStep
              ? t("search.subtitleOverview")
              : showRhythmStep
                ? t("search.subtitleRhythm")
                : showRegionsStep
                  ? t("search.subtitleRegions")
                  : t("search.subtitleActivities")}
      </p>

      <SearchStepIndicator
        step={step}
        tripMode={trip.mode}
        tripComplete
        onStep={(s) => {
          if ((s === 4 || s === 5) && !trip.trip_rhythm && trip.departure_date) {
            setTrip((prev) => {
              const next = {
                ...prev,
                trip_rhythm: defaultRhythmForTrip(prev.departure_date, prev.return_date, {
                  includeKids: hasChildrenInPassengers(prev.passengers),
                }),
              };
              syncUrl(next, s);
              return next;
            });
          } else {
            syncUrl(trip, s);
          }
          setStep(s);
        }}
      />

      <TripContextBar trip={trip} onEdit={editTripOnHome} searchStep={step} />

      {missingDestinationCoords && (
        <Card className="mb-6 border-warning/40 bg-orange-50/60">
          <CardBody className="text-sm text-text-secondary">
            Nie mamy współrzędnych dla „
            {trip.destination_label ?? trip.destination}”. Wybierz miejsce z
            listy podpowiedzi na stronie głównej albo poczekaj chwilę — próbujemy
            je ustalić automatycznie.
          </CardBody>
        </Card>
      )}

      {showScopeStep && (
        <>
          <Card className="mb-8">
            <CardHeader title={t("search.scopeTitle")} />
            <CardBody className="space-y-4">
              <p className="text-sm text-text-secondary">
                {t("search.scopeIntro")}{" "}
                <strong>{trip.destination_label ?? trip.destination}</strong> —
                {t("search.scopeIntroEnd")}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {EXPLORATION_SCOPE_OPTIONS.map((option) => {
                  const active = trip.exploration_scope === option.value;
                  const label =
                    locale === "en" ? option.label_en : option.label_pl;
                  const description =
                    locale === "en"
                      ? option.description_en
                      : option.description_pl;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setExplorationScope(option.value)}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        active
                          ? "border-brand-700 bg-brand-50 ring-2 ring-brand-200"
                          : "border-border-default hover:border-brand-300"
                      }`}
                    >
                      <p className="font-semibold text-text-primary">{label}</p>
                      <p className="mt-1 text-sm text-text-secondary">
                        {description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Button
            size="lg"
            disabled={missingDestinationCoords}
            onClick={() => {
              setStep(3);
              syncUrl(trip, 3);
            }}
          >
            {t("search.continueToOverview")}
          </Button>
        </>
      )}

      {showOverviewStep && (
        <DestinationOverviewPanel
          destinationLabel={trip.destination_label ?? trip.destination ?? ""}
          destinationLat={trip.destination_lat}
          destinationLon={trip.destination_lon}
          discovering={discovering}
          discovery={discovery}
          discoveryError={discoveryError}
          onRetry={() => {
            discoveryCacheKey.current = null;
            discoveryFailedKey.current = null;
            setDiscoveryRetry((n) => n + 1);
          }}
          waitingForCoords={missingDestinationCoords}
          onChooseActivities={goToRhythmStep}
        />
      )}

      {showRhythmStep && trip.trip_rhythm && (
        <TripRhythmStep
          departureDate={trip.departure_date}
          returnDate={trip.return_date}
          passengers={trip.passengers}
          rhythm={trip.trip_rhythm}
          onChange={updateRhythm}
          onContinue={goToRegionsStep}
        />
      )}

      {showRegionsStep && trip.trip_rhythm && (
        <>
          {regionsLoading && <SkeletonList count={2} />}
          {!regionsLoading && (
            <TouristRegionCards
              regions={scoredRegions}
              rhythm={trip.trip_rhythm}
              selectedId={trip.tourist_region_id}
              onSelect={handleSelectRegion}
              onContinue={goToActivitiesStep}
              onBack={() => {
                setStep(4);
                syncUrl(trip, 4);
              }}
            />
          )}
        </>
      )}

      {showActivitiesStep && (
        <>
          {suggestionsUnverified && (
            <Card className="mb-6 border-amber-300 bg-amber-50/90">
              <CardBody className="text-sm">
                <p className="font-semibold text-text-primary">
                  {t("search.suggestionsUnverifiedTitle")}
                </p>
                <p className="mt-1 text-text-secondary">
                  {t("search.suggestionsUnverifiedBody")}
                </p>
              </CardBody>
            </Card>
          )}

          {showDataInfo && (
            <Card className="mb-6 border-warning/40 bg-orange-50/60">
              <CardBody>
                <p className="font-medium text-text-primary">
                  Wyszukiwanie regionów jest niedostępne
                </p>
                <p className="mt-2 text-sm text-text-secondary">
                  {dataStatus!.tags === 0
                    ? `Masz ${dataStatus!.attractions} atrakcji, ale brak tagów aktywności — uruchom „Tylko tagowanie” w panelu admina.`
                    : `Baza ma ${dataStatus!.attractions} atrakcji — sprawdź scrape OSM (region Iberia dla Hiszpanii).`}
                </p>
                <Link
                  href="/app/admin"
                  className="mt-3 inline-flex rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
                >
                  Otwórz panel admina →
                </Link>
              </CardBody>
            </Card>
          )}

          <Card id="search-activities" className="mb-8 scroll-mt-6">
            <CardHeader title={t("search.activities")} />
            <CardBody>
              {trip.trip_rhythm && isDestinationFlow && (
                <p className="mb-4 rounded-lg border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm text-text-secondary">
                  <span className="font-medium text-text-primary">
                    {t("search.rhythmPlanHint")}:{" "}
                  </span>
                  {formatRhythmSummary(trip.trip_rhythm, locale)}.{" "}
                  {t("search.activitiesFromRhythm")}
                </p>
              )}
              {pageLoading && <SkeletonList count={3} />}
              {!pageLoading && taxonomy.length === 0 && (
                <p className="text-sm text-danger">
                  Nie udało się załadować aktywności.
                </p>
              )}
              {!pageLoading && taxonomy.length > 0 && selectedActivities.size === 0 && (
                <p className="mb-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-text-secondary">
                  Zaznacz co najmniej jedną aktywność poniżej.
                  {trip.interests
                    ? ` (Szukaliśmy dopasowań do „${trip.interests}” — wybierz ręcznie jeśli brak.)`
                    : ""}
                </p>
              )}
              {!pageLoading &&
                primaryGroups.map((group) => (
                  <div key={group.slug} className="mb-6 last:mb-0">
                    <h3 className="mb-3 font-semibold text-text-primary">
                      {locale === "en" ? group.name_en : group.name_pl}
                      {trip.trip_rhythm && (
                        <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800">
                          {locale === "en" ? "Suggested" : "Sugerowane"}
                        </span>
                      )}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {group.activities.map((activity) => {
                        const selected = selectedActivities.has(activity.slug);
                        return (
                          <button
                            key={activity.slug}
                            type="button"
                            onClick={() => toggleActivity(activity.slug)}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                              selected
                                ? "bg-brand-700 text-white"
                                : "bg-bg-soft text-text-secondary hover:bg-brand-50 hover:text-brand-700"
                            }`}
                          >
                            {locale === "en" ? activity.name_en : activity.name_pl}
                            {isDestinationFlow &&
                              activityCounts[activity.slug] != null &&
                              activityCounts[activity.slug] > 0 && (
                                <span
                                  className={`ml-1.5 text-xs ${
                                    selected ? "text-white/80" : "text-text-tertiary"
                                  }`}
                                >
                                  ({activityCounts[activity.slug]})
                                </span>
                              )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              {!pageLoading && optionalGroups.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-text-secondary hover:text-brand-700">
                    {locale === "en"
                      ? "Other activities (optional)"
                      : "Inne aktywności (opcjonalnie)"}
                  </summary>
                  <div className="mt-4 space-y-6">
                    {optionalGroups.map((group) => (
                      <div key={group.slug}>
                        <h3 className="mb-3 font-semibold text-text-primary">
                          {locale === "en" ? group.name_en : group.name_pl}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {group.activities.map((activity) => {
                            const selected = selectedActivities.has(activity.slug);
                            return (
                              <button
                                key={activity.slug}
                                type="button"
                                onClick={() => toggleActivity(activity.slug)}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                                  selected
                                    ? "bg-brand-700 text-white"
                                    : "bg-bg-soft text-text-secondary hover:bg-brand-50 hover:text-brand-700"
                                }`}
                              >
                                {locale === "en"
                                  ? activity.name_en
                                  : activity.name_pl}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </CardBody>
          </Card>

          <details className="mb-8">
            <summary className="cursor-pointer text-sm font-medium text-text-secondary hover:text-brand-700">
              Zaawansowane parametry wyszukiwania
            </summary>
            <Card className="mt-3">
            <CardBody className="space-y-4 text-sm">
              <div>
                <p className="mb-2 font-medium text-text-primary">
                  Tryb dopasowania
                </p>
                <label className="mr-4">
                  <input
                    type="radio"
                    checked={matchMode === "all"}
                    onChange={() => setMatchMode("all")}
                  />{" "}
                  Wszystkie wybrane
                </label>
                <label>
                  <input
                    type="radio"
                    checked={matchMode === "any"}
                    onChange={() => setMatchMode("any")}
                  />{" "}
                  Dowolna z wybranych
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="font-medium text-text-primary">
                    Maks. promień (km)
                  </span>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    Atrakcje w jednym rejonie — np. 10–15 km na jeden dzień,
                    nie cała wyspa.
                  </p>
                  <input
                    type="number"
                    min={3}
                    max={80}
                    value={maxRadius}
                    onChange={(e) => setMaxRadius(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-border-default px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </label>
                <label className="block">
                  <span className="font-medium text-text-primary">
                    Min. atrakcji / aktywność
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={minPerActivity}
                    onChange={(e) => setMinPerActivity(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-border-default px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </label>
              </div>
            </CardBody>
            </Card>
          </details>

          <div className="mb-6 flex flex-wrap gap-3">
            <Button
              onClick={() => handleSearch()}
              disabled={
                isSearching ||
                selectedActivities.size === 0 ||
                pageLoading ||
                !dbReady
              }
              size="lg"
            >
              {isSearching
                ? t("search.searching")
                : !dbReady
                  ? t("search.noOsm")
                  : t("search.searchWithCount", { n: selectedActivities.size })}
            </Button>
            <Button variant="ghost" onClick={editTripOnHome}>
              {t("search.editTrip")}
            </Button>
          </div>

          <RefineInput
            searchType="activities"
            currentParams={getSearchParams()}
            onApply={(newParams) => {
              if (Array.isArray(newParams.activities)) {
                setSelectedActivities(new Set(newParams.activities as string[]));
              }
              if (
                newParams.match_mode === "all" ||
                newParams.match_mode === "any"
              ) {
                setMatchMode(newParams.match_mode);
              }
              if (typeof newParams.max_radius_km === "number") {
                setMaxRadius(newParams.max_radius_km);
              }
              if (typeof newParams.min_per_activity === "number") {
                setMinPerActivity(newParams.min_per_activity);
              }
              handleSearch({
                activities: Array.isArray(newParams.activities)
                  ? (newParams.activities as string[])
                  : Array.from(selectedActivities),
                match_mode:
                  newParams.match_mode === "all" ||
                  newParams.match_mode === "any"
                    ? newParams.match_mode
                    : matchMode,
                max_radius_km:
                  typeof newParams.max_radius_km === "number"
                    ? newParams.max_radius_km
                    : maxRadius,
                min_per_activity:
                  typeof newParams.min_per_activity === "number"
                    ? newParams.min_per_activity
                    : minPerActivity,
              });
            }}
          />
        </>
      )}

      {error && <p className="mb-4 text-danger">Błąd: {error}</p>}
      {isSearching && <SkeletonList count={5} />}

      {showResultsStep && results && !isSearching && (
        <section className="mt-8">
          {results.view_mode === "island" && results.island_overview ? (
            <>
              <h2 className="font-display mb-2 text-xl font-bold text-text-primary">
                Cała {results.island_overview.island_name} — przegląd atrakcji
              </h2>
              <p className="mb-6 text-sm text-text-secondary">
                {formatTravelSummary(trip)} · {formatTripDateRange(trip)} ·{" "}
                {results.total_attractions_considered} miejsc na wyspie · nie
                wybieramy jeszcze bazy noclegowej
              </p>

              <Card className="mb-6 overflow-hidden">
                <RegionMap
                  points={
                    buildIslandMapData({
                      attractions: results.island_overview.attractions,
                      airports: results.island_overview.airports,
                    }).points
                  }
                  segments={[]}
                  height={520}
                  showRouteList={false}
                />
                <CardBody className="text-sm text-text-secondary">
                  <p>
                    <span className="mr-4 inline-flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded-full bg-[#003faa]" />
                      Lotnisko
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded-full bg-[#16a34a]" />
                      Atrakcja
                    </span>
                  </p>
                  {results.island_overview.airports.length > 0 && (
                    <p className="mt-2">
                      Lotniska:{" "}
                      {results.island_overview.airports
                        .map((a) => `${a.name} (${a.iata_code})`)
                        .join(" · ")}
                    </p>
                  )}
                  {results.total_attractions_considered >
                    results.island_overview.attractions.length && (
                    <p className="mt-1 text-xs text-text-tertiary">
                      Na mapie pierwsze 300 punktów z{" "}
                      {results.total_attractions_considered} znalezionych.
                    </p>
                  )}
                </CardBody>
              </Card>

              <Card className="mb-8">
                <CardHeader title="Co znaleźliśmy na wyspie" />
                <CardBody>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(results.island_overview.activity_counts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([slug, count]) => (
                        <span
                          key={slug}
                          className="rounded-full bg-brand-50 px-3 py-1.5 text-sm text-brand-800"
                        >
                          {taxonomy
                            .flatMap((g) => g.activities)
                            .find((a) => a.slug === slug)
                            ? locale === "en"
                              ? taxonomy
                                  .flatMap((g) => g.activities)
                                  .find((a) => a.slug === slug)!.name_en
                              : taxonomy
                                  .flatMap((g) => g.activities)
                                  .find((a) => a.slug === slug)!.name_pl
                            : slug}
                          : {count}
                        </span>
                      ))}
                  </div>
                </CardBody>
              </Card>

              {!showIslandRegions ? (
                <div className="mb-8 text-center">
                  <p className="mb-4 text-sm text-text-secondary">
                    Po przeglądzie wybierz rejon, w którym chcesz się zatrzymać.
                  </p>
                  <Button
                    size="lg"
                    onClick={() => setShowIslandRegions(true)}
                    disabled={results.clusters.length === 0}
                  >
                    Wybierz region na nocleg →
                  </Button>
                  {results.clusters.length === 0 && (
                    <p className="mt-3 text-sm text-text-tertiary">
                      Brak wyodrębnionych regionów — spróbuj mniej aktywności
                      lub trybu „dowolna z wybranych”.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <h3 className="font-display mb-4 text-lg font-bold text-text-primary">
                    Wybierz region na nocleg ({results.clusters.length})
                  </h3>
                  {results.clusters.map((cluster, idx) => (
                    <RegionResultCard
                      key={cluster.id}
                      cluster={cluster}
                      idx={idx}
                      airports={results.airports ?? []}
                      destinationLabel={trip.destination_label ?? undefined}
                      activityNames={activityNames}
                      locale={locale}
                      onOpen={() => openDestination(cluster)}
                      ctaLabel="Planuj pobyt w tym regionie →"
                    />
                  ))}
                </>
              )}
            </>
          ) : (
            <>
              <h2 className="font-display mb-2 text-xl font-bold text-text-primary">
                Regiony ({results.clusters.length})
              </h2>
              <p className="mb-6 text-sm text-text-secondary">
                {formatTravelSummary(trip)} · {formatTripDateRange(trip)} ·
                Każdy rejon ma mapę i krótki opis — wybierz bazę na nocleg
              </p>

              {results.clusters.length === 0 && (
                <EmptyResultsCard
                  results={results}
                  trip={trip}
                  suggestionsUnverified={suggestionsUnverified}
                  locale={locale}
                  onChangeActivities={goToActivitiesStep}
                  onChangeScope={goToScopeStep}
                  onSearchLooser={searchLooser}
                  t={t}
                />
              )}

              {results.clusters.map((cluster, idx) => (
                <RegionResultCard
                  key={cluster.id}
                  cluster={cluster}
                  idx={idx}
                  airports={results.airports ?? []}
                  destinationLabel={trip.destination_label ?? undefined}
                  activityNames={activityNames}
                  locale={locale}
                  onOpen={() => openDestination(cluster)}
                  ctaLabel="Zobacz szczegóły regionu →"
                />
              ))}
            </>
          )}
        </section>
      )}
    </PageContainer>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<PageContainer>Ładuję wyszukiwarkę...</PageContainer>}>
      <SearchPageContent />
    </Suspense>
  );
}

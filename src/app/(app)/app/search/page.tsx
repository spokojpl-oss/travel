"use client";

import { useEffect, useMemo, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLocale, useT } from "@/i18n/locale-provider";
import { RefineInput } from "@/components/features/RefineInput";
import { RegionResultCard } from "@/components/features/RegionResultCard";
import {
  SearchStepIndicator,
  TripContextBar,
  type SearchStep,
} from "@/components/features/TripContextBar";
import { TripRhythmStep } from "@/components/features/TripRhythmStep";
import { TouristRegionCards } from "@/components/features/TouristRegionCards";
import { ExplorationScopeStep } from "@/components/features/ExplorationScopeStep";
import { SearchScopeParamsPanel } from "@/components/features/SearchScopeParamsPanel";
import { IslandOverviewSection } from "@/components/features/IslandOverviewSection";
import { buildAttractionOverviewFromClusters } from "@/lib/maps/build-attraction-overview";
import type { ScoredTouristRegion } from "@/lib/destinations/tourist-regions";
import {
  defaultRhythmForTrip,
  hasChildrenInPassengers,
  isGroupInRhythm,
  suggestActivitiesFromRhythm,
  type TripRhythm,
} from "@/lib/search/trip-rhythm";
import { adviseExplorationScope } from "@/lib/search/scope-advisor";
import { assessIslandFeasibility } from "@/lib/search/island-feasibility";
import {
  storeDestinationBuildPayload,
  type PlanRegionContext,
} from "@/lib/search/destination-build-payload";
import {
  buildClusterFromAttractions,
  sanitizeClusterForDestination,
  filterAttractionsToDestinationIsland,
} from "@/lib/plan/cluster-island-guard";
import {
  centroidOfTouristRegions,
  filterAttractionsToTouristRegions,
  filterClustersToTouristRegions,
  reanchorClusterToTouristRegions,
} from "@/lib/plan/tourist-region-anchor";
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
  daysBetweenIso,
  resolveDestinationCoords,
  isCyclingTrip,
  tripContextFromParams,
  tripContextToParams,
  type ExplorationScope,
  type TripContext,
} from "@/lib/search/trip-context";
import {
  clearSearchRestoreState,
  consumeSearchRerunFlag,
  readSearchRestoreState,
} from "@/lib/search/search-restore";
import { DestinationOverviewPanel } from "@/components/features/DestinationOverviewPanel";
import { scopeSearchRadii, explorationScopeFromString } from "@/lib/search/exploration-scope";
import { resolveDestinationSizeProfile } from "@/lib/search/destination-size";
import type { DestinationDiscovery } from "@/lib/search/destination-discover";
import { buildFallbackDiscovery } from "@/lib/search/destination-discover";
import type {
  Activity,
  ActivityGroup,
  ActivitySearchResult,
  AttractionWithActivities,
  GeoCluster,
} from "@/types/domain";

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
  const searchTopRef = useRef<HTMLDivElement>(null);
  const [pendingResultsRerun, setPendingResultsRerun] = useState(false);
  const [activityCounts, setActivityCounts] = useState<Record<string, number>>({});
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(
    new Set(),
  );
  const [matchMode, setMatchMode] = useState<"all" | "any">("any");
  const [maxRadius, setMaxRadius] = useState(15);
  const [minPerActivity, setMinPerActivity] = useState(1);
  const [results, setResults] = useState<ActivitySearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [scoredRegions, setScoredRegions] = useState<ScoredTouristRegion[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const interestsMatchedRef = useRef(false);

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
    if (initialized) return;

    const fromUrl = tripContextFromParams(searchParams);
    let merged = mergeTripContext(defaultTripContext(), fromUrl);
    let resolvedStep: SearchStep = 2;
    const scopeFromUrl = explorationScopeFromString(
      searchParams.get("exploration_scope"),
    );

    const restored = readSearchRestoreState();
    if (restored) {
      setSelectedActivities(new Set(restored.activities));
      clearSearchRestoreState();
    }

    if (Object.keys(fromUrl).length > 0) {
      merged = mergeTripContext(merged, fromUrl);

      if (merged.mode === "destination") {
        setMatchMode("any");
        const label = merged.destination_label ?? merged.destination ?? "";
        if (!scopeFromUrl && merged.departure_date && label) {
          const advice = adviseExplorationScope({
            destinationLabel: label,
            departureDate: merged.departure_date,
            returnDate: merged.return_date,
            passengers: merged.passengers,
            locale,
            destinationLat: merged.destination_lat,
            destinationLon: merged.destination_lon,
          });
          merged = mergeTripContext(merged, {
            exploration_scope: advice.recommended,
          });
        } else if (scopeFromUrl) {
          merged = mergeTripContext(merged, {
            exploration_scope: scopeFromUrl,
          });
        }
        const scope = merged.exploration_scope ?? "region";
        setMaxRadius(scopeSearchRadii(scope).stay_radius_km);
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

      if (
        merged.mode === "destination" &&
        merged.exploration_scope === "island" &&
        resolvedStep === 5
      ) {
        resolvedStep = 6;
      }

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
            {
              includeKids: hasChildrenInPassengers(merged.passengers),
              cycling: isCyclingTrip(merged),
            },
          ),
        });
      }
    }

    setTrip(merged);
    setInitialized(true);
  }, [initialized, searchParams, locale]);

  useEffect(() => {
    if (!initialized || interestsMatchedRef.current || taxonomy.length === 0) return;
    if (!trip.interests?.trim()) return;

    const matched = matchActivitySlugsFromText(trip.interests, taxonomy);
    if (matched.length > 0) {
      setSelectedActivities(new Set(matched));
      interestsMatchedRef.current = true;
    }
  }, [initialized, taxonomy, trip.interests]);

  useEffect(() => {
    if (!initialized) return;
    searchTopRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step, initialized]);

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
      setTrip((t) => {
        const nextLabel = coords.label;
        const scopeFromUrl = explorationScopeFromString(
          searchParams.get("exploration_scope"),
        );
        let exploration_scope = t.exploration_scope;
        if (
          !scopeFromUrl &&
          t.departure_date &&
          nextLabel &&
          t.exploration_scope === "region"
        ) {
          const advice = adviseExplorationScope({
            destinationLabel: nextLabel,
            departureDate: t.departure_date,
            returnDate: t.return_date,
            passengers: t.passengers,
            locale,
            destinationLat: coords.lat,
            destinationLon: coords.lon,
          });
          exploration_scope = advice.recommended;
        }
        return {
          ...t,
          destination_lat: coords.lat,
          destination_lon: coords.lon,
          destination_label: nextLabel,
          exploration_scope,
        };
      });
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
    searchParams,
    locale,
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
    setMaxRadius(radii.stay_radius_km);
    setTrip((t) => {
      const next = { ...t, exploration_scope: scope };
      syncUrl(next, step);
      return next;
    });
  }

  function handleMaxRadiusChange(km: number) {
    setMaxRadius(Math.min(80, Math.max(3, km)));
  }

  const isDestinationFlow = trip.mode === "destination";
  const skipRegionsStep = trip.exploration_scope === "island";
  const showScopeStep = isDestinationFlow && step === 2;
  const showOverviewStep = isDestinationFlow && step === 3;
  const showRhythmStep = isDestinationFlow && step === 4;
  const showRegionsStep = isDestinationFlow && step === 5 && !skipRegionsStep;
  const showActivitiesStep = isDestinationFlow ? step === 6 : step === 2;
  const showResultsStep = isDestinationFlow ? step === 7 : step === 3;

  const tripDays = useMemo(
    () =>
      trip.departure_date
        ? daysBetweenIso(trip.departure_date, trip.return_date ?? trip.departure_date)
        : 0,
    [trip.departure_date, trip.return_date],
  );

  const scopeDestinationLabel =
    trip.destination_label ?? trip.destination ?? "";

  const scopeProfilePending = useMemo(() => {
    if (!scopeDestinationLabel.trim()) return false;
    const near =
      trip.destination_lat != null && trip.destination_lon != null
        ? { lat: trip.destination_lat, lon: trip.destination_lon }
        : null;
    if (resolveDestinationSizeProfile(scopeDestinationLabel, near)) return false;
    return trip.destination_lat == null || trip.destination_lon == null;
  }, [
    scopeDestinationLabel,
    trip.destination_lat,
    trip.destination_lon,
  ]);

  const islandFeasibility = useMemo(() => {
    if (!trip.destination_label && !trip.destination) return null;
    return assessIslandFeasibility({
      destinationLabel: trip.destination_label ?? trip.destination ?? "",
      tripDays,
      explorationScope: trip.exploration_scope ?? "region",
      passengers: trip.passengers,
      weather: discovery?.weather ?? null,
      locale,
    });
  }, [
    trip.destination_label,
    trip.destination,
    tripDays,
    trip.exploration_scope,
    trip.passengers,
    discovery?.weather,
    locale,
  ]);

  const taxonomyActivities = useMemo(
    () => taxonomy.flatMap((g) => g.activities),
    [taxonomy],
  );

  useEffect(() => {
    if (!initialized || !isDestinationFlow || step !== 5) return;
    if (!trip.trip_rhythm) return;

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
        rhythm: trip.trip_rhythm ?? undefined,
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

  function syncUrl(nextTrip: TripContext, nextStep?: SearchStep) {
    const p = tripContextToParams(nextTrip);
    if (nextStep) p.set("step", String(nextStep));
    router.replace(`/app/search?${p.toString()}`, { scroll: false });
  }

  function updateRhythm(rhythm: TripRhythm) {
    setTrip((prev) => {
      const next = { ...prev, trip_rhythm: rhythm, tourist_region_id: null, tourist_region_ids: [] };
      syncUrl(next, step);
      return next;
    });
    setSelectedActivities(new Set());
  }

  function handleOverviewDatesChange(
    departure: string,
    returnDate: string | null,
  ) {
    discoveryCacheKey.current = null;
    discoveryFailedKey.current = null;
    setTrip((prev) => {
      const next = {
        ...prev,
        departure_date: departure,
        return_date: returnDate,
      };
      syncUrl(next, step);
      return next;
    });
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
            cycling: isCyclingTrip(prev),
          }),
      };
      syncUrl(next, 4);
      return next;
    });
  }

  function goAfterRhythmStep() {
    if (skipRegionsStep) {
      goToActivitiesStep();
      return;
    }
    setStep(5);
    syncUrl(trip, 5);
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
    setStep(6);
    syncUrl(trip, 6);
  }

  function centroidOfRegions(
    list: ScoredTouristRegion[],
  ): { lat: number; lon: number } | null {
    if (list.length === 0) return null;
    return {
      lat: list.reduce((s, r) => s + r.center_lat, 0) / list.length,
      lon: list.reduce((s, r) => s + r.center_lon, 0) / list.length,
    };
  }

  function handleRegionSelectionChange(ids: string[]) {
    const rhythm = trip.trip_rhythm;
    const selectedRegions = ids
      .map((id) => scoredRegions.find((r) => r.id === id))
      .filter((r): r is ScoredTouristRegion => r != null);

    if (rhythm && selectedRegions.length > 0) {
      const extraSlugs = [
        ...new Set(selectedRegions.flatMap((r) => r.activity_slugs)),
      ];
      const slugs = suggestActivitiesFromRhythm({
        rhythm,
        counts: activityCounts,
        weather: discovery?.weather ?? null,
        passengers: trip.passengers,
        extraSlugs,
      });
      setSelectedActivities(new Set(slugs));
    }

    const center = centroidOfRegions(selectedRegions);

    setTrip((prev) => {
      const next = {
        ...prev,
        tourist_region_ids: ids,
        tourist_region_id: ids[0] ?? null,
        destination_lat: center?.lat ?? prev.destination_lat,
        destination_lon: center?.lon ?? prev.destination_lon,
      };
      syncUrl(next, step);
      return next;
    });
  }

  function handleWholeIslandChoice() {
    let nextActivities = selectedActivities;
    const nextTrip = {
      ...trip,
      exploration_scope: "island" as const,
      tourist_region_ids: [] as string[],
      tourist_region_id: null as string | null,
    };
    if (nextTrip.trip_rhythm && selectedActivities.size === 0) {
      nextActivities = new Set(
        suggestActivitiesFromRhythm({
          rhythm: nextTrip.trip_rhythm,
          counts: activityCounts,
          weather: discovery?.weather ?? null,
          passengers: nextTrip.passengers,
        }),
      );
      setSelectedActivities(nextActivities);
    }
    setTrip(nextTrip);
    setStep(6);
    syncUrl(nextTrip, 6);
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
      stay_radius_km?: number;
      explore_radius_km?: number;
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
      params.explore_radius_km = radii.explore_radius_km;
      params.stay_radius_km = maxRadius;
      params.max_radius_km = maxRadius;
    } else {
      params.stay_radius_km = maxRadius;
    }

    if (
      trip.destination_lat != null &&
      trip.destination_lon != null &&
      Number.isFinite(trip.destination_lat) &&
      Number.isFinite(trip.destination_lon)
    ) {
      params.near_lat = trip.destination_lat;
      params.near_lon = trip.destination_lon;
      if (params.explore_radius_km == null) {
        params.explore_radius_km =
          trip.mode === "destination" ? 150 : 250;
      }
      params.near_radius_km = params.explore_radius_km;
    }

    if (trip.destination_label) {
      params.destination_label = trip.destination_label;
    }

    return params;
  }

  function narrowScopeToRegion() {
    setExplorationScope("region");
    goToScopeStep();
  }

  function extendTripOnHome() {
    const p = tripContextToParams(trip);
    if (islandFeasibility?.suggestedMinDays && trip.departure_date) {
      const extra = islandFeasibility.suggestedMinDays - tripDays;
      if (extra > 0) {
        const base = trip.return_date ?? trip.departure_date;
        const end = new Date(`${base}T12:00:00`);
        end.setDate(end.getDate() + extra);
        p.set("return_date", end.toISOString().slice(0, 10));
      }
    }
    router.push(`/app?${p.toString()}#search`);
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

    setStep(isDestinationFlow ? 7 : 3);
    syncUrl(trip, isDestinationFlow ? 7 : 3);

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

      const searchResult = data as ActivitySearchResult;

      setResults(searchResult);
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

  useEffect(() => {
    if (!initialized) return;
    if (consumeSearchRerunFlag()) {
      setPendingResultsRerun(true);
    }
  }, [initialized]);

  useEffect(() => {
    if (!pendingResultsRerun || step !== 7) return;
    if (selectedActivities.size === 0 || !dataStatus?.search_ready || isSearching) return;
    setPendingResultsRerun(false);
    void handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rerun once when landing from plan wizard
  }, [pendingResultsRerun, step, selectedActivities.size, dataStatus?.search_ready, isSearching]);

  function regionContextFromTrip(): PlanRegionContext | undefined {
    const ids =
      trip.tourist_region_ids.length > 0
        ? trip.tourist_region_ids
        : trip.tourist_region_id
          ? [trip.tourist_region_id]
          : [];
    if (ids.length === 0) return undefined;
    const matched = ids
      .map((id) => scoredRegions.find((r) => r.id === id))
      .filter((r): r is ScoredTouristRegion => r != null);
    const primary = matched[0];
    if (!primary) return undefined;
    if (matched.length === 1) {
      return {
        id: primary.id,
        name_pl: primary.name_pl,
        name_en: primary.name_en,
        overview_pl: primary.overview_pl,
        overview_en: primary.overview_en,
        stay_hint_pl: primary.stay_hint_pl,
        stay_hint_en: primary.stay_hint_en,
      };
    }
    const pl = locale !== "en";
    return {
      id: primary.id,
      name_pl: matched.map((r) => r.name_pl).join(" · "),
      name_en: matched.map((r) => r.name_en).join(" · "),
      overview_pl: pl
        ? `Wybraliście ${matched.length} rejony — plan może łączyć bazy w: ${matched.map((r) => r.name_pl).join(", ")}.`
        : primary.overview_pl,
      overview_en:
        locale === "en"
          ? `You picked ${matched.length} areas — the plan can combine bases in: ${matched.map((r) => r.name_en).join(", ")}.`
          : primary.overview_en,
      stay_hint_pl: primary.stay_hint_pl,
      stay_hint_en: primary.stay_hint_en,
    };
  }

  function selectedTouristRegions(): ScoredTouristRegion[] {
    return trip.tourist_region_ids
      .map((id) => scoredRegions.find((r) => r.id === id))
      .filter((r): r is ScoredTouristRegion => r != null);
  }

  function resolveClusterForSelectedRegions(
    clusters: GeoCluster[],
    destinationLabel: string,
  ): GeoCluster | null {
    const regions = selectedTouristRegions();
    if (regions.length === 0) return null;

    const allAttrs = clusters.flatMap((c) => c.attractions);
    const regionAttrs = filterAttractionsToTouristRegions(allAttrs, regions);
    const filteredClusters = filterClustersToTouristRegions(clusters, regions);

    if (filteredClusters.length > 0) {
      const best = [...filteredClusters].sort(
        (a, b) => b.attractions.length - a.attractions.length,
      )[0]!;
      return reanchorClusterToTouristRegions(
        regionAttrs.length > 0
          ? { ...best, attractions: regionAttrs }
          : best,
        regions,
      );
    }

    if (regionAttrs.length > 0) {
      return (
        buildClusterFromAttractions({
          attractions: regionAttrs,
          destinationLabel,
          id: `regions-${Date.now()}`,
        }) ?? null
      );
    }

    const center = centroidOfTouristRegions(regions);
    if (!center) return null;

    return {
      id: `regions-${Date.now()}`,
      center,
      bbox: {
        north: center.lat + 0.2,
        south: center.lat - 0.2,
        east: center.lon + 0.2,
        west: center.lon - 0.2,
      },
      radius_km: Math.max(...regions.map((r) => r.radius_km ?? 20)),
      attractions: [],
      covered_activities: [],
      score: 1,
      activity_counts: {},
    };
  }

  function storeAndGoToPlan(
    buildId: string,
    cluster: GeoCluster,
    pool: AttractionWithActivities[],
    selectedAttractionIds?: string[],
  ) {
    const searchRadii = getSearchParams();
    const airports =
      results?.airports ??
      results?.island_overview?.airports ??
      [];
    storeDestinationBuildPayload(buildId, {
      cluster,
      activities: Array.from(selectedActivities),
      destinationLabel: trip.destination_label ?? trip.destination ?? undefined,
      region: regionContextFromTrip(),
      attractionPool: pool,
      selectedAttractionIds:
        selectedAttractionIds && selectedAttractionIds.length > 0
          ? selectedAttractionIds
          : undefined,
      planComplete: false,
      poolEnriched: false,
      touristRegionId: trip.tourist_region_id,
      touristRegionIds: trip.tourist_region_ids,
      explorationScope: trip.exploration_scope,
      stayRadiusKm: searchRadii.stay_radius_km ?? searchRadii.max_radius_km,
      exploreRadiusKm: searchRadii.explore_radius_km,
      tripDays: daysBetweenIso(
        trip.departure_date,
        trip.return_date ?? trip.departure_date,
      ),
      airports,
    });
    const tripParams = tripContextToParams(trip);
    tripParams.set("build_id", buildId);
    const path = "/app/destination";
    router.push(`${path}?${tripParams.toString()}`);
  }

  function openDestination(cluster: GeoCluster) {
    const label = trip.destination_label ?? trip.destination ?? "";
    let sanitized = sanitizeClusterForDestination(cluster, label);
    const regions = selectedTouristRegions();
    if (regions.length > 0) {
      sanitized = reanchorClusterToTouristRegions(sanitized, regions);
    }
    const pool = filterAttractionsToDestinationIsland(
      sanitized.attractions.length > 0
        ? sanitized.attractions
        : cluster.attractions,
      label,
      sanitized.center,
    );
    storeAndGoToPlan(sanitized.id, { ...sanitized, attractions: pool }, pool);
  }

  function openIslandPlan(
    selectedIds: string[],
    pool: AttractionWithActivities[],
  ) {
    const label = trip.destination_label ?? trip.destination ?? "";
    const selected = pool.filter((a) => selectedIds.includes(a.id));
    let cluster =
      buildClusterFromAttractions({
        attractions: selected.length > 0 ? selected : pool,
        destinationLabel: label,
        id: `island-${Date.now()}`,
      }) ?? null;
    if (!cluster) return;
    const regions = selectedTouristRegions();
    if (regions.length > 0) {
      cluster = reanchorClusterToTouristRegions(cluster, regions);
    }
    const fullPool = filterAttractionsToDestinationIsland(pool, label, cluster.center);
    storeAndGoToPlan(
      cluster.id,
      cluster,
      fullPool,
      selectedIds.length > 0 ? selectedIds : undefined,
    );
  }

  const dbReady = dataStatus?.search_ready ?? false;
  const missingDestinationCoords =
    trip.mode === "destination" &&
    (trip.destination_lat == null || trip.destination_lon == null) &&
    Boolean(trip.destination_label ?? trip.destination);

  const resultClusters = useMemo(() => {
    if (!results?.clusters.length) return [];
    const regionIds =
      trip.tourist_region_ids.length > 0
        ? trip.tourist_region_ids
        : trip.tourist_region_id
          ? [trip.tourist_region_id]
          : [];
    const regions = regionIds
      .map((id) => scoredRegions.find((r) => r.id === id))
      .filter((r): r is ScoredTouristRegion => r != null);
    if (regions.length === 0) return results.clusters;
    return filterClustersToTouristRegions(results.clusters, regions);
  }, [
    results,
    trip.tourist_region_ids,
    trip.tourist_region_id,
    scoredRegions,
  ]);

  const selectedRegionLabel = useMemo(() => {
    const ids =
      trip.tourist_region_ids.length > 0
        ? trip.tourist_region_ids
        : trip.tourist_region_id
          ? [trip.tourist_region_id]
          : [];
    const names = ids
      .map((id) => scoredRegions.find((r) => r.id === id))
      .filter((r): r is ScoredTouristRegion => r != null)
      .map((r) => (locale === "en" ? r.name_en : r.name_pl));
    if (names.length > 0) return names.join(" · ");
    return trip.destination_label ?? trip.destination ?? "";
  }, [
    trip.tourist_region_ids,
    trip.tourist_region_id,
    trip.destination_label,
    trip.destination,
    scoredRegions,
    locale,
  ]);

  const attractionMapOverview = useMemo(() => {
    if (!results) return null;
    if (results.island_overview) return results.island_overview;

    const clustersForMap =
      resultClusters.length > 0 ? resultClusters : results.clusters;
    if (clustersForMap.length === 0) return null;

    return buildAttractionOverviewFromClusters(clustersForMap, {
      name: selectedRegionLabel,
      selectedActivities: Array.from(selectedActivities),
      airports: results.airports ?? [],
    });
  }, [
    results,
    resultClusters,
    selectedRegionLabel,
    selectedActivities,
  ]);

  const showDataInfo =
    dataStatus &&
    !dataStatus.search_ready &&
    !pageLoading &&
    (isDestinationFlow ? step >= 6 : step >= 2);

  return (
    <PageContainer>
      <div ref={searchTopRef} className="scroll-mt-4" aria-hidden />
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
        skipRegionsStep={skipRegionsStep}
        onStep={(s) => {
          if (
            s === 5 &&
            skipRegionsStep
          ) {
            return;
          }
          if ((s === 4 || s === 5) && !trip.trip_rhythm && trip.departure_date) {
            setTrip((prev) => {
              const next = {
                ...prev,
                trip_rhythm: defaultRhythmForTrip(prev.departure_date, prev.return_date, {
                  includeKids: hasChildrenInPassengers(prev.passengers),
                  cycling: isCyclingTrip(prev),
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

      {showActivitiesStep && trip.exploration_scope !== "island" && (
        <SearchScopeParamsPanel
          matchMode={matchMode}
          onMatchModeChange={setMatchMode}
          maxRadius={maxRadius}
          onMaxRadiusChange={handleMaxRadiusChange}
          minPerActivity={minPerActivity}
          onMinPerActivityChange={setMinPerActivity}
        />
      )}

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

      {showScopeStep && !initialized && trip.departure_date && (
        <SkeletonList count={3} />
      )}

      {showScopeStep && initialized && scopeProfilePending && trip.departure_date && (
        <SkeletonList count={3} />
      )}

      {showScopeStep &&
        initialized &&
        !scopeProfilePending &&
        trip.departure_date && (
        <ExplorationScopeStep
          destinationLabel={scopeDestinationLabel}
          departureDate={trip.departure_date}
          returnDate={trip.return_date}
          passengers={trip.passengers}
          destinationLat={trip.destination_lat}
          destinationLon={trip.destination_lon}
          selectedScope={trip.exploration_scope ?? "region"}
          onSelectScope={setExplorationScope}
          onContinue={() => {
            if (missingDestinationCoords) return;
            setStep(3);
            syncUrl(trip, 3);
          }}
        />
      )}

      {showScopeStep && !trip.departure_date && (
        <Card className="mb-8">
          <CardBody className="text-sm text-text-secondary">
            {t("search.scopeMissingDates")}
          </CardBody>
        </Card>
      )}

      {showScopeStep && missingDestinationCoords && trip.departure_date && (
        <Card className="mb-6 border-warning/40 bg-orange-50/60">
          <CardBody className="text-sm text-text-secondary">
            {t("search.scopeMissingCoords")}
          </CardBody>
        </Card>
      )}

      {showOverviewStep && (
        <DestinationOverviewPanel
          destinationLabel={trip.destination_label ?? trip.destination ?? ""}
          destinationLat={trip.destination_lat}
          destinationLon={trip.destination_lon}
          discovering={discovering}
          discovery={discovery}
          discoveryError={discoveryError}
          tripDays={tripDays}
          departureDate={trip.departure_date}
          returnDate={trip.return_date}
          onDatesChange={handleOverviewDatesChange}
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
          onContinue={goAfterRhythmStep}
          isCycling={isCyclingTrip(trip)}
          continueLabel={
            skipRegionsStep ? t("rhythm.continueActivities") : undefined
          }
        />
      )}

      {showRegionsStep && trip.trip_rhythm && (
        <>
          {regionsLoading && <SkeletonList count={2} />}
          {!regionsLoading && (
            <TouristRegionCards
              regions={scoredRegions}
              selectedIds={trip.tourist_region_ids}
              onSelectedIdsChange={handleRegionSelectionChange}
              destinationLabel={
                trip.destination_label ?? trip.destination ?? ""
              }
              onChooseWholeIsland={handleWholeIslandChoice}
              onContinue={goToActivitiesStep}
              onSkip={goToActivitiesStep}
              onBack={() => {
                setStep(2);
                syncUrl(trip, 2);
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
                <p className="mb-4 text-sm text-text-secondary">
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
          {attractionMapOverview ? (
            <IslandOverviewSection
              results={{ ...results, island_overview: attractionMapOverview }}
              activityNames={activityNames}
              taxonomyActivities={taxonomyActivities}
              feasibility={
                results.view_mode === "island" ? islandFeasibility : null
              }
              variant={results.view_mode === "island" ? "island" : "region"}
              onNarrowScope={narrowScopeToRegion}
              onExtendTrip={extendTripOnHome}
              onPlanTrip={openIslandPlan}
            />
          ) : (
            <>
              <h2 className="font-display mb-2 text-xl font-bold text-text-primary">
                {`Regiony (${resultClusters.length})`}
              </h2>
              <p className="mb-6 text-sm text-text-secondary">
                {`${formatTravelSummary(trip)} · ${formatTripDateRange(trip)} ·${
                  trip.tourist_region_ids.length > 0
                    ? " Wyniki ograniczone do wybranych rejonów — wybierz bazę na nocleg"
                    : " Każdy rejon ma mapę i krótki opis — wybierz bazę na nocleg"
                }`}
              </p>

              {resultClusters.length === 0 && (
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

              {resultClusters.map((cluster, idx) => (
                <RegionResultCard
                  key={cluster.id}
                  cluster={cluster}
                  idx={idx}
                  airports={results.airports ?? []}
                  destinationLabel={trip.destination_label ?? undefined}
                  activityNames={activityNames}
                  locale={locale}
                  onOpen={() => openDestination(cluster)}
                  ctaLabel="Zaplanuj wyjazd w tym rejonie →"
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

"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLocale, useT } from "@/i18n/locale-provider";
import { RefineInput } from "@/components/features/RefineInput";
import { RegionMapMini } from "@/components/features/RegionMap";
import {
  SearchStepIndicator,
  TripContextBar,
} from "@/components/features/TripContextBar";
import { buildClusterMapData } from "@/lib/maps/build-cluster-map";
import { clusterDisplayName } from "@/lib/search/settlement-resolver";
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

function SearchPageContent() {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<2 | 3 | 4 | 5>(2);
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

    const restored = sessionStorage.getItem("restore_search_activities");
    if (restored) {
      try {
        const params = JSON.parse(restored) as { activities?: string[] };
        if (params.activities?.length) {
          setSelectedActivities(new Set(params.activities));
          setStep(merged.mode === "destination" ? 4 : 2);
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
      const resolvedStep: 2 | 3 | 4 | 5 =
        merged.mode === "destination"
          ? stepParam === "5"
            ? 5
            : stepParam === "4"
              ? 4
              : stepParam === "3"
                ? 3
                : 2
          : stepParam === "3" || stepParam === "4" || stepParam === "5"
            ? 3
            : 2;
      setStep(resolvedStep);
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
    const timeout = setTimeout(() => controller.abort(), 45000);

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
          if (data.suggested_activities.length > 0) {
            setSelectedActivities(new Set(data.suggested_activities));
          }
        }
      })
      .catch((e) => {
        if (!cancelled) {
          discoveryFailedKey.current = cacheKey;
          setDiscovery(null);
          setDiscoveryError(
            e instanceof Error && e.name === "AbortError"
              ? t("search.discoverErrorGeneric")
              : e instanceof Error
                ? e.message
                : t("search.discoverErrorGeneric"),
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
    if (!initialized || trip.mode !== "destination" || step !== 4) return;
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
  const showActivitiesStep = isDestinationFlow ? step === 4 : step === 2;
  const showResultsStep = isDestinationFlow ? step === 5 : step === 3;

  function syncUrl(nextTrip: TripContext, nextStep?: 2 | 3 | 4 | 5) {
    const p = tripContextToParams(nextTrip);
    if (nextStep) p.set("step", String(nextStep));
    router.replace(`/app/search?${p.toString()}`, { scroll: false });
  }

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
    setStep(isDestinationFlow ? 5 : 3);
    syncUrl(trip, isDestinationFlow ? 5 : 3);

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
      const result = data as ActivitySearchResult;

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
    (isDestinationFlow ? step >= 4 : step >= 2);

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
              : t("search.titleActivities")}
      </h1>
      <p className="mb-4 text-sm text-text-secondary">
        {showResultsStep
          ? t("search.subtitleResults")
          : showScopeStep
            ? t("search.subtitleScope")
            : showOverviewStep
              ? t("search.subtitleOverview")
              : t("search.subtitleActivities")}
      </p>

      <SearchStepIndicator
        step={step}
        tripMode={trip.mode}
        tripComplete
        onStep={(s) => {
          setStep(s);
          syncUrl(trip, s);
        }}
      />

      <TripContextBar trip={trip} onEdit={editTripOnHome} />

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
          taxonomy={taxonomy}
          selectedActivities={selectedActivities}
          onToggleActivity={toggleActivity}
          onContinue={() => {
            setStep(4);
            syncUrl(trip, 4);
          }}
        />
      )}

      {showActivitiesStep && (
        <>
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

          <Card className="mb-8">
            <CardHeader title={t("search.activities")} />
            <CardBody>
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
                taxonomy.map((group) => (
                  <div key={group.slug} className="mb-6 last:mb-0">
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
          <h2 className="font-display mb-2 text-xl font-bold text-text-primary">
            {isDestinationFlow ? "4" : "3"}. Wyniki ({results.clusters.length}{" "}
            regionów)
          </h2>
          <p className="mb-6 text-sm text-text-secondary">
            {formatTravelSummary(trip)} ·{" "}
            {formatTripDateRange(trip)} · Czas wyszukiwania:{" "}
            {results.duration_ms}ms
          </p>

          {results.clusters.length === 0 && (
            <Card>
              <CardBody>
                <p className="text-text-secondary">
                  Nie znaleziono regionów
                  {trip.destination_label
                    ? ` w okolicy ${trip.destination_label}`
                    : ""}{" "}
                  dla wybranych aktywności.
                </p>
                {results.total_attractions_considered === 0 && (
                  <p className="mt-3 text-sm text-text-secondary">
                    Brak atrakcji w bazie dla wybranych aktywności
                    {trip.destination_label
                      ? ` w okolicy ${trip.destination_label}`
                      : ""}
                    . Przy wyszukiwaniu próbujemy uzupełnić dane z OpenStreetMap.
                    {dataStatus && dataStatus.attractions === 0 && (
                      <span className="mt-2 block text-amber-800">
                        {t("search.attractionsEmptyHint")} (w bazie:{" "}
                        {dataStatus.attractions} atrakcji, {dataStatus.tags}{" "}
                        tagów)
                      </span>
                    )}
                    {selectedActivities.has("zoo") &&
                      !selectedActivities.has("aquarium") && (
                        <>
                          {" "}
                          Delfinaria często są oznaczone jako akwaria — spróbuj
                          też zaznaczyć „Akwaria”.
                        </>
                      )}
                    {results.meta && (
                      <>
                        {" "}
                        (w promieniu: {results.meta.attractions_in_bbox} miejsc
                        OSM, {results.meta.tag_rows_fetched} tagów
                        {results.meta.geo_radius_km_used
                          ? `, szukano do ${results.meta.geo_radius_km_used} km`
                          : ""}
                        )
                      </>
                    )}
                  </p>
                )}
                {results.total_attractions_considered > 0 && (
                  <p className="mt-3 text-sm text-text-secondary">
                    Znaleziono {results.total_attractions_considered} atrakcji, ale
                    żaden klaster nie spełnia kryteriów — spróbuj trybu „dowolna z
                    wybranych” lub zwiększ promień w ustawieniach zaawansowanych.
                  </p>
                )}
              </CardBody>
            </Card>
          )}

          {results.clusters.map((cluster, idx) => {
            const mapData = buildClusterMapData(cluster);
            return (
            <Card key={cluster.id} className="card-hover mb-4 overflow-hidden">
              <RegionMapMini
                points={mapData.points}
                segments={mapData.segments}
              />
              <CardBody>
                <h3 className="font-display text-lg font-bold text-text-primary">
                  #{idx + 1} – {clusterDisplayName(cluster)}
                </h3>
                <p className="mt-1 text-sm text-text-secondary">
                  {cluster.settlement?.name
                    ? `Baza pobytu: ${cluster.settlement.name} · `
                    : ""}
                  Score: {cluster.score} · Rozpiętość: {cluster.radius_km} km ·
                  Atrakcji: {cluster.attractions.length}
                  {cluster.radius_km > 25 && (
                    <span className="text-amber-700">
                      {" "}
                      · Duży region — rozważ mniejszy promień w ustawieniach
                    </span>
                  )}
                </p>
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => openDestination(cluster)}
                >
                  Zobacz szczegóły regionu →
                </Button>
              </CardBody>
            </Card>
            );
          })}
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

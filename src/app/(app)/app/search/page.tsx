"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RefineInput } from "@/components/features/RefineInput";
import { TripSearchForm } from "@/components/features/TripSearchForm";
import {
  SearchStepIndicator,
  TripContextBar,
} from "@/components/features/TripContextBar";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Breadcrumb, PageContainer } from "@/components/layout/Header";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  defaultTripContext,
  formatTripDateRange,
  hasTripParams,
  mergeTripContext,
  matchActivitySlugsFromText,
  resolveDestinationCoords,
  tripContextFromParams,
  tripContextToParams,
  type TripContext,
} from "@/lib/search/trip-context";
import type {
  Activity,
  ActivityGroup,
  ActivitySearchResult,
  GeoCluster,
} from "@/types/domain";
import { agentLog } from "@/lib/debug/agent-log";

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
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [trip, setTrip] = useState<TripContext>(defaultTripContext);
  const [taxonomy, setTaxonomy] = useState<TaxonomyResponse["groups"]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(
    new Set(),
  );
  const [matchMode, setMatchMode] = useState<"all" | "any">("any");
  const [maxRadius, setMaxRadius] = useState(80);
  const [minPerActivity, setMinPerActivity] = useState(1);
  const [results, setResults] = useState<ActivitySearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!hasTripParams(searchParams)) {
      agentLog(
        "search/page.tsx:redirect",
        "no trip params — redirect to /app",
        { params: searchParams.toString() },
        "C",
      );
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
        agentLog(
          "search/page.tsx:mount",
          "page data loaded",
          {
            mount_ms: Date.now() - mountStart,
            taxonomy_groups: taxonomyData.groups?.length ?? 0,
            search_ready: (statusData as DataStatus | null)?.search_ready ?? null,
            tags: (statusData as DataStatus | null)?.tags ?? null,
          },
          "B",
        );
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
          setStep(2);
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
        setMaxRadius(80);
      }

      const stepParam = searchParams.get("step");
      if (stepParam === "3") setStep(3);
      else if (stepParam === "1") setStep(1);
      else setStep(2);
    }

    setTrip(merged);
    setInitialized(true);
  }, [initialized, pageLoading, searchParams, taxonomy]);

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

  function syncUrl(nextTrip: TripContext, nextStep?: 1 | 2 | 3) {
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
    } = {
      activities: Array.from(selectedActivities),
      match_mode: matchMode,
      max_radius_km: maxRadius,
      min_per_activity: minPerActivity,
    };

    if (
      trip.destination_lat != null &&
      trip.destination_lon != null &&
      Number.isFinite(trip.destination_lat) &&
      Number.isFinite(trip.destination_lon)
    ) {
      params.near_lat = trip.destination_lat;
      params.near_lon = trip.destination_lon;
      params.near_radius_km = trip.mode === "destination" ? 150 : 250;
    }

    return params;
  }

  async function handleSearch(
    overrideParams?: ReturnType<typeof getSearchParams>,
  ) {
    const params = overrideParams ?? getSearchParams();
    if (params.activities.length === 0) {
      agentLog(
        "search/page.tsx:handleSearch",
        "blocked — no activities",
        { params },
        "E",
      );
      return;
    }
    if (!dataStatus?.search_ready) {
      agentLog(
        "search/page.tsx:handleSearch",
        "blocked — db not ready",
        { dataStatus, params },
        "E",
      );
      setError(
        dataStatus?.message ??
          "Baza atrakcji nie jest gotowa — uruchom tagowanie w panelu admina.",
      );
      return;
    }
    setIsSearching(true);
    setError(null);
    setResults(null);
    setStep(3);
    syncUrl(trip, 3);

    const clientStart = Date.now();
    agentLog(
      "search/page.tsx:handleSearch",
      "fetch start",
      {
        activities: params.activities.length,
        has_near: params.near_lat != null,
        match_mode: params.match_mode,
      },
      "A",
    );

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
      agentLog(
        "search/page.tsx:handleSearch",
        "fetch done",
        {
          client_ms: Date.now() - clientStart,
          clusters: (data as ActivitySearchResult).clusters.length,
          attractions: (data as ActivitySearchResult).total_attractions_considered,
          server_ms: (data as ActivitySearchResult).duration_ms,
        },
        "A",
      );
    } catch (e) {
      agentLog(
        "search/page.tsx:handleSearch",
        "fetch error",
        {
          client_ms: Date.now() - clientStart,
          error: e instanceof Error ? e.message : String(e),
          aborted: e instanceof Error && e.name === "AbortError",
        },
        "A",
      );
      if (e instanceof Error && e.name === "AbortError") {
        setError(
          "Szukanie trwało zbyt długo — spróbuj mniej aktywności lub zawęź destynację.",
        );
      } else {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    } finally {
      setIsSearching(false);
    }
  }

  function openDestination(cluster: GeoCluster) {
    const clusterParam = encodeURIComponent(JSON.stringify(cluster));
    const activitiesParam = encodeURIComponent(
      JSON.stringify(Array.from(selectedActivities)),
    );
    router.push(
      `/app/destination?cluster=${clusterParam}&activities=${activitiesParam}`,
    );
  }

  const dbReady = dataStatus?.search_ready ?? false;
  const missingDestinationCoords =
    trip.mode === "destination" &&
    (trip.destination_lat == null || trip.destination_lon == null) &&
    Boolean(trip.destination_label ?? trip.destination);

  const showDataInfo =
    dataStatus && !dataStatus.search_ready && !pageLoading && step >= 2;

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: "Start", href: "/app" },
          { label: "Wyniki wyszukiwania" },
        ]}
      />

      <h1 className="font-display mb-2 text-3xl font-bold text-text-primary">
        {step === 1 ? "Edytuj podróż" : "Wybierz aktywności"}
      </h1>
      <p className="mb-4 text-sm text-text-secondary">
        {step === 1
          ? "Zmień daty, lotnisko lub destynację — potem wrócisz do wyboru aktywności."
          : "Dane podróży masz już uzupełnione ze strony głównej. Zaznacz co chcecie robić i szukaj regionów."}
      </p>

      <SearchStepIndicator
        step={step}
        onStep={(s) => {
          if (s === 1) {
            setStep(1);
            syncUrl(trip, 1);
          } else if (s === 2 && step === 3) {
            setStep(2);
            syncUrl(trip, 2);
          }
        }}
      />

      {step !== 1 && (
        <TripContextBar trip={trip} onEdit={() => {
          setStep(1);
          syncUrl(trip, 1);
        }} />
      )}

      {step === 1 && (
        <Card className="mb-8">
          <CardHeader title="Twoja podróż" />
          <CardBody className="space-y-6">
            <div className="flex gap-2">
              <ModePill
                active={trip.mode === "activities"}
                onClick={() => setTrip((t) => ({ ...t, mode: "activities" }))}
                label="Od aktywności"
              />
              <ModePill
                active={trip.mode === "destination"}
                onClick={() => setTrip((t) => ({ ...t, mode: "destination" }))}
                label="Od destynacji"
              />
            </div>
            <TripSearchForm
              trip={trip}
              onChange={setTrip}
              showInterests={trip.mode === "activities"}
              showDestination={trip.mode === "destination"}
            />
            <Button
              size="lg"
              onClick={() => {
                syncUrl(trip, 2);
                setStep(2);
              }}
            >
              Zapisz i wróć do aktywności →
            </Button>
          </CardBody>
        </Card>
      )}

      {step >= 2 && (
        <>
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
            <CardHeader title="Aktywności" />
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
                      {group.name_pl}
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
                            {activity.name_pl}
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
                  <input
                    type="number"
                    min={5}
                    max={200}
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
                ? "Szukam regionów..."
                : !dbReady
                  ? "Brak danych OSM — uruchom scrape"
                  : `Szukaj (${selectedActivities.size} aktywności)`}
            </Button>
            <Button variant="ghost" onClick={() => {
              setStep(1);
              syncUrl(trip, 1);
            }}>
              ← Edytuj podróż
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

      {step === 3 && results && !isSearching && (
        <section className="mt-8">
          <h2 className="font-display mb-2 text-xl font-bold text-text-primary">
            3. Wyniki ({results.clusters.length} regionów)
          </h2>
          <p className="mb-6 text-sm text-text-secondary">
            {trip.origin_label && `Lot z: ${trip.origin_label} · `}
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
                    .
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

          {results.clusters.map((cluster, idx) => (
            <Card key={cluster.id} className="card-hover mb-4">
              <CardBody>
                <h3 className="font-display text-lg font-bold text-text-primary">
                  #{idx + 1} – Region {cluster.center.lat.toFixed(2)},{" "}
                  {cluster.center.lon.toFixed(2)}
                </h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Score: {cluster.score} · Promień: {cluster.radius_km} km ·
                  Atrakcji: {cluster.attractions.length}
                </p>
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => openDestination(cluster)}
                >
                  Zobacz loty i hotele →
                </Button>
              </CardBody>
            </Card>
          ))}
        </section>
      )}
    </PageContainer>
  );
}

function ModePill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
          : "rounded-full bg-bg-soft px-4 py-2 text-sm font-medium text-text-secondary hover:bg-brand-50"
      }
    >
      {label}
    </button>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<PageContainer>Ładuję wyszukiwarkę...</PageContainer>}>
      <SearchPageContent />
    </Suspense>
  );
}

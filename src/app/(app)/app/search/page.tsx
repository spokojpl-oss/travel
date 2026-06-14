"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RefineInput } from "@/components/features/RefineInput";
import { HowItWorksGuide } from "@/components/features/HowItWorksGuide";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Breadcrumb, PageContainer } from "@/components/layout/Header";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type {
  Activity,
  ActivityGroup,
  ActivitySearchResult,
  GeoCluster,
} from "@/types/domain";

type TaxonomyResponse = {
  groups: Array<ActivityGroup & { activities: Activity[] }>;
  meta?: {
    source?: "database" | "fallback";
    reason?: string;
    db_error?: string;
  };
};

type DataStatus = {
  activities: number;
  attractions: number;
  tags: number;
  search_ready: boolean;
  message: string | null;
};

export default function SearchPage() {
  const router = useRouter();
  const [taxonomy, setTaxonomy] = useState<TaxonomyResponse["groups"]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [taxonomyMeta, setTaxonomyMeta] = useState<TaxonomyResponse["meta"]>();
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(
    new Set(),
  );
  const [matchMode, setMatchMode] = useState<"all" | "any">("all");
  const [maxRadius, setMaxRadius] = useState(50);
  const [minPerActivity, setMinPerActivity] = useState(1);

  const [results, setResults] = useState<ActivitySearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageLoading(true);
    Promise.all([
      fetch("/api/activities/taxonomy").then(async (r) => {
        const data = (await r.json()) as TaxonomyResponse & { error?: string };
        if (!r.ok) {
          throw new Error(data.error ?? `HTTP ${r.status}`);
        }
        return data;
      }),
      fetch("/api/activities/status")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([taxonomyData, statusData]) => {
        setTaxonomy(taxonomyData.groups ?? []);
        setTaxonomyMeta(taxonomyData.meta);
        if (statusData) setDataStatus(statusData as DataStatus);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setPageLoading(false));
  }, []);

  useEffect(() => {
    const restored = sessionStorage.getItem("restore_search_activities");
    if (restored) {
      try {
        const params = JSON.parse(restored) as {
          activities?: string[];
          match_mode?: "all" | "any";
          max_radius_km?: number;
          min_per_activity?: number;
        };
        setSelectedActivities(new Set(params.activities ?? []));
        setMatchMode(params.match_mode ?? "all");
        setMaxRadius(params.max_radius_km ?? 50);
        setMinPerActivity(params.min_per_activity ?? 1);
        sessionStorage.removeItem("restore_search_activities");
      } catch {
        // ignore invalid restore data
      }
    }
  }, []);

  function toggleActivity(slug: string) {
    const next = new Set(selectedActivities);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setSelectedActivities(next);
  }

  function getSearchParams() {
    return {
      activities: Array.from(selectedActivities),
      match_mode: matchMode,
      max_radius_km: maxRadius,
      min_per_activity: minPerActivity,
    };
  }

  async function handleSearch(overrideParams?: ReturnType<typeof getSearchParams>) {
    const params = overrideParams ?? getSearchParams();
    if (params.activities.length === 0) return;
    setIsSearching(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/search/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Search failed",
        );
      }

      setResults(data as ActivitySearchResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
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

  const showDataInfo =
    dataStatus && !dataStatus.search_ready && !pageLoading;

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: "Start", href: "/app" },
          { label: "Wyszukiwarka aktywności" },
        ]}
      />

      <h1 className="font-display mb-4 text-3xl font-bold text-text-primary">
        Wyszukiwarka aktywności
      </h1>

      <HowItWorksGuide variant="compact" className="mb-6" />

      {showDataInfo && (
        <Card className="mb-6 border-brand-200 bg-brand-50/50">
          <CardBody>
            <p className="font-medium text-text-primary">
              Aktywności działają — wyszukiwanie regionów wymaga danych OSM
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Możesz wybierać aktywności z katalogu
              {taxonomyMeta?.source === "fallback"
                ? " wbudowanego"
                : ""}
              , ale mapowanie na regiony zadziała dopiero po załadowaniu
              atrakcji do bazy ({dataStatus.attractions} atrakcji,{" "}
              {dataStatus.tags} tagów).
            </p>
            <details className="mt-3 text-sm text-text-tertiary">
              <summary className="cursor-pointer font-medium text-brand-700">
                Instrukcja dla administratora
              </summary>
              <p className="mt-2">
                {dataStatus.message ??
                  "Uruchom seed activities.sql i scrape OSM."}
              </p>
              <p className="mt-2">
                <Link
                  href="/app/admin"
                  className="font-semibold text-brand-700 hover:underline"
                >
                  Otwórz panel diagnostyczny →
                </Link>{" "}
                (status bazy, scrape z przycisku, komunikaty błędów).
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>
                  W Supabase: migracja 007 + seed{" "}
                  <code className="rounded bg-white px-1">activities.sql</code>
                </li>
                <li>
                  <code className="rounded bg-white px-1">
                    POST /api/admin/initial-scrape
                  </code>{" "}
                  (konto z ADMIN_EMAILS)
                </li>
              </ol>
            </details>
          </CardBody>
        </Card>
      )}

      <Card className="mb-8">
        <CardHeader title="1. Wybierz aktywności" />
        <CardBody>
          {pageLoading && <SkeletonList count={3} />}

          {!pageLoading && taxonomy.length === 0 && (
            <p className="text-sm text-danger">
              Nie udało się załadować aktywności. Odśwież stronę lub sprawdź
              połączenie z Supabase.
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

      <Card className="mb-8">
        <CardHeader title="2. Parametry" />
        <CardBody className="space-y-4 text-sm">
          <div>
            <p className="mb-2 font-medium text-text-primary">Tryb dopasowania</p>
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
          <div>
            <label className="font-medium text-text-primary">
              Maks. promień klastra:{" "}
              <input
                type="number"
                min={5}
                max={200}
                value={maxRadius}
                onChange={(e) => setMaxRadius(Number(e.target.value))}
                className="ml-2 w-20 rounded-md border border-border-default px-2 py-1 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />{" "}
              km
            </label>
          </div>
          <div>
            <label className="font-medium text-text-primary">
              Min. atrakcji per aktywność:{" "}
              <input
                type="number"
                min={1}
                max={10}
                value={minPerActivity}
                onChange={(e) => setMinPerActivity(Number(e.target.value))}
                className="ml-2 w-16 rounded-md border border-border-default px-2 py-1 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </div>
        </CardBody>
      </Card>

      <Button
        onClick={() => handleSearch()}
        disabled={
          isSearching || selectedActivities.size === 0 || pageLoading
        }
        size="lg"
        className="mb-6"
      >
        {isSearching
          ? "Szukam..."
          : `Szukaj (${selectedActivities.size} aktywności)`}
      </Button>

      <RefineInput
        searchType="activities"
        currentParams={getSearchParams()}
        onApply={(newParams) => {
          if (Array.isArray(newParams.activities)) {
            setSelectedActivities(new Set(newParams.activities as string[]));
          }
          if (newParams.match_mode === "all" || newParams.match_mode === "any") {
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
              newParams.match_mode === "all" || newParams.match_mode === "any"
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

      {error && <p className="mb-4 text-danger">Błąd: {error}</p>}

      {isSearching && <SkeletonList count={5} />}

      {results && !isSearching && (
        <section className="mt-8">
          <h2 className="font-display mb-2 text-xl font-bold text-text-primary">
            Wyniki ({results.clusters.length} regionów)
          </h2>
          <p className="mb-6 text-sm text-text-secondary">
            Czas: {results.duration_ms}ms, rozważono{" "}
            {results.total_attractions_considered} atrakcji
          </p>

          {results.clusters.length === 0 && (
            <Card>
              <CardBody>
                <p className="text-text-secondary">
                  Nie znaleziono regionów dla wybranych aktywności.
                </p>
                {results.total_attractions_considered === 0 ? (
                  <p className="mt-3 text-sm text-text-secondary">
                    W bazie nie ma jeszcze otagowanych atrakcji dla tych
                    aktywności. Uruchom w Supabase seed{" "}
                    <code>activities.sql</code> i scrape OSM (
                    <code>/api/admin/initial-scrape</code>). Tymczasem spróbuj
                    mniej aktywności lub tryb &quot;Dowolna z wybranych&quot;.
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-text-secondary">
                    Spróbuj tryb &quot;Dowolna z wybranych&quot;, zwiększ promień
                    lub wybierz mniej aktywności.
                  </p>
                )}
                <Link
                  href="/app#guide"
                  className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline"
                >
                  Jak działa wyszukiwarka →
                </Link>
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
                  Atrakcji: {cluster.attractions.length} · Pokryte:{" "}
                  {cluster.covered_activities.length}/{selectedActivities.size}
                </p>
                <p className="mt-1 text-sm">
                  <strong>Pokrycie:</strong>{" "}
                  {Object.entries(cluster.activity_counts)
                    .map(([slug, count]) => `${slug}: ${count}`)
                    .join(", ")}
                </p>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-brand-700">
                    Atrakcje ({cluster.attractions.length})
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                    {cluster.attractions.map((a) => (
                      <li key={a.id}>
                        {a.name} ({a.category}) – {Number(a.lat).toFixed(3)},{" "}
                        {Number(a.lon).toFixed(3)}
                        {a.address && ` – ${a.address}`}
                      </li>
                    ))}
                  </ul>
                </details>
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => openDestination(cluster)}
                >
                  Zobacz szczegóły regionu →
                </Button>
              </CardBody>
            </Card>
          ))}
        </section>
      )}
    </PageContainer>
  );
}

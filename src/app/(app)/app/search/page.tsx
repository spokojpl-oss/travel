"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Activity,
  ActivityGroup,
  ActivitySearchResult,
  GeoCluster,
} from "@/types/domain";

type TaxonomyResponse = {
  groups: Array<ActivityGroup & { activities: Activity[] }>;
};

export default function SearchPage() {
  const router = useRouter();
  const [taxonomy, setTaxonomy] = useState<TaxonomyResponse["groups"]>([]);
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
    fetch("/api/activities/taxonomy")
      .then((r) => r.json())
      .then((data: TaxonomyResponse) => setTaxonomy(data.groups ?? []))
      .catch((e) => setError(String(e)));
  }, []);

  function toggleActivity(slug: string) {
    const next = new Set(selectedActivities);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setSelectedActivities(next);
  }

  async function handleSearch() {
    if (selectedActivities.size === 0) return;
    setIsSearching(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/search/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activities: Array.from(selectedActivities),
          match_mode: matchMode,
          max_radius_km: maxRadius,
          min_per_activity: minPerActivity,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Search failed");
      }

      const data: ActivitySearchResult = await response.json();
      setResults(data);
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

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Wyszukiwarka aktywności</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">1. Wybierz aktywności</h2>
        {taxonomy.map((group) => (
          <div key={group.slug} className="mb-4">
            <h3 className="font-medium mb-2">{group.name_pl}</h3>
            <div className="flex flex-wrap gap-3">
              {group.activities.map((activity) => (
                <label key={activity.slug} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={selectedActivities.has(activity.slug)}
                    onChange={() => toggleActivity(activity.slug)}
                  />
                  {activity.name_pl}
                </label>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="text-lg font-semibold">2. Parametry</h2>
        <p>
          Tryb dopasowania:{" "}
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
        </p>
        <p>
          Maks. promień klastra:{" "}
          <input
            type="number"
            min={5}
            max={200}
            value={maxRadius}
            onChange={(e) => setMaxRadius(Number(e.target.value))}
            className="border px-2 py-1 rounded w-20"
          />{" "}
          km
        </p>
        <p>
          Min. atrakcji per aktywność:{" "}
          <input
            type="number"
            min={1}
            max={10}
            value={minPerActivity}
            onChange={(e) => setMinPerActivity(Number(e.target.value))}
            className="border px-2 py-1 rounded w-16"
          />
        </p>
      </section>

      <button
        onClick={handleSearch}
        disabled={isSearching || selectedActivities.size === 0}
        className="border px-4 py-2 rounded bg-black text-white disabled:opacity-50 mb-6"
      >
        {isSearching
          ? "Szukam..."
          : `Szukaj (${selectedActivities.size} aktywności)`}
      </button>

      {error && <p className="text-red-600 mb-4">Błąd: {error}</p>}

      {results && (
        <section>
          <h2 className="text-lg font-semibold mb-2">
            Wyniki ({results.clusters.length} regionów)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Czas: {results.duration_ms}ms, rozważono{" "}
            {results.total_attractions_considered} atrakcji
          </p>

          {results.clusters.length === 0 && (
            <p>
              Nie znaleziono regionów. Spróbuj tryb &quot;Dowolna z
              wybranych&quot;, zwiększ promień lub wybierz mniej aktywności.
            </p>
          )}

          {results.clusters.map((cluster, idx) => (
            <article
              key={cluster.id}
              className="border p-4 rounded mb-4"
            >
              <h3 className="font-semibold">
                #{idx + 1} – Region {cluster.center.lat.toFixed(2)},{" "}
                {cluster.center.lon.toFixed(2)}
              </h3>
              <p className="text-sm mt-1">
                Score: {cluster.score} | Promień: {cluster.radius_km} km |
                Atrakcji: {cluster.attractions.length} | Pokryte:{" "}
                {cluster.covered_activities.length}/{selectedActivities.size}
              </p>
              <p className="text-sm mt-1">
                <strong>Pokrycie:</strong>{" "}
                {Object.entries(cluster.activity_counts)
                  .map(([slug, count]) => `${slug}: ${count}`)
                  .join(", ")}
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer">
                  Atrakcje ({cluster.attractions.length})
                </summary>
                <ul className="mt-2 space-y-1 text-sm">
                  {cluster.attractions.map((a) => (
                    <li key={a.id}>
                      {a.name} ({a.category}) – {Number(a.lat).toFixed(3)},{" "}
                      {Number(a.lon).toFixed(3)}
                      {a.address && ` – ${a.address}`}
                    </li>
                  ))}
                </ul>
              </details>
              <button
                onClick={() => openDestination(cluster)}
                className="mt-3 border px-3 py-1 rounded text-sm bg-black text-white"
              >
                Zobacz szczegóły regionu →
              </button>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

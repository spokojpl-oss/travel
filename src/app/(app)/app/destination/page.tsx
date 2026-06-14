"use client";

import { FlightsSection } from "@/components/features/FlightsSection";
import { HotelsSection } from "@/components/features/HotelsSection";
import { TransportSection } from "@/components/features/TransportSection";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Attraction, Destination } from "@/types/domain";
import type { DestinationSummary } from "@/lib/synthesis/destination-summary";
import type { WikivoyageDestinationContent } from "@/lib/api/wikivoyage";
import type { GooglePlace } from "@/lib/api/google-places";

type BuildEvent = {
  type: string;
  [key: string]: unknown;
};

export default function DestinationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [events, setEvents] = useState<BuildEvent[]>([]);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [summary, setSummary] = useState<DestinationSummary | null>(null);
  const [weather, setWeather] = useState<object | null>(null);
  const [wikivoyage, setWikivoyage] =
    useState<WikivoyageDestinationContent | null>(null);
  const [googlePlaces, setGooglePlaces] = useState<GooglePlace[]>([]);
  const [attractionCount, setAttractionCount] = useState(0);
  const [attractions, setAttractions] = useState<
    Pick<Attraction, "id" | "name">[]
  >([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const clusterData = searchParams.get("cluster");
  const activitiesParam = searchParams.get("activities");

  useEffect(() => {
    if (startedRef.current) return;
    if (!clusterData || !activitiesParam) {
      setError("Brak danych klastra – wróć do wyszukiwarki");
      return;
    }
    startedRef.current = true;

    let cluster: unknown;
    let activities: string[];
    try {
      cluster = JSON.parse(decodeURIComponent(clusterData));
      activities = JSON.parse(decodeURIComponent(activitiesParam));
    } catch {
      setError("Nieprawidłowe dane URL");
      return;
    }

    startBuild(cluster, activities);
  }, [clusterData, activitiesParam]);

  useEffect(() => {
    if (!destination) return;

    fetch(`/api/destination/${destination.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load attractions");
        return res.json();
      })
      .then((data: { attractions?: Attraction[] }) => {
        if (data.attractions) {
          setAttractions(
            data.attractions.map((a) => ({ id: a.id, name: a.name })),
          );
        }
      })
      .catch(() => {
        /* attractions optional for display */
      });
  }, [destination?.id]);

  async function startBuild(cluster: unknown, activities: string[]) {
    setIsBuilding(true);
    setError(null);

    try {
      const response = await fetch("/api/destination/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cluster,
          selected_activities: activities,
        }),
      });

      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => ({ error: "Build failed" }));
        throw new Error(
          typeof err.error === "string" ? err.error : "Build failed",
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.substring(6)) as BuildEvent;
            setEvents((prev) => [...prev, event]);
            handleEvent(event);
          } catch {
            console.error("Failed to parse SSE event:", line);
          }
        }
      }

      setIsComplete(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsBuilding(false);
    }
  }

  function handleEvent(event: BuildEvent) {
    if (event.type === "destination_ready") {
      setDestination(event.destination as Destination);
    } else if (event.type === "weather_loaded") {
      setWeather((event.weather as object | null) ?? null);
    } else if (event.type === "wikivoyage_loaded") {
      setWikivoyage(
        (event.wikivoyage as WikivoyageDestinationContent | null) ?? null,
      );
    } else if (event.type === "attractions_loaded") {
      setAttractionCount((event.count as number) ?? 0);
    } else if (event.type === "google_places_loaded") {
      setGooglePlaces((event.places as GooglePlace[]) ?? []);
    } else if (event.type === "ai_synthesis_loaded") {
      setSummary(event.summary as DestinationSummary);
    }
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Błąd</h1>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => router.back()}
          className="underline"
        >
          Wróć
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <button
        onClick={() => router.push("/app/search")}
        className="underline mb-4"
      >
        ← Wróć do wyszukiwarki
      </button>

      <header className="mb-8">
        <h1 className="text-2xl font-bold">
          {destination?.name ?? "Buduję destynację..."}
        </h1>
        {destination && (
          <p className="text-sm text-gray-600 mt-1">
            {destination.country_code} · {destination.destination_type} ·{" "}
            {destination.timezone}
          </p>
        )}
        {destination?.bounding_box && (
          <p className="text-xs text-gray-500 mt-1">
            Bbox: {JSON.stringify(destination.bounding_box)}
          </p>
        )}
      </header>

      {isBuilding && (
        <section className="mb-8 border p-4 rounded">
          <h2 className="font-semibold mb-2">Postęp budowania</h2>
          <ol className="text-sm space-y-1">
            {events.map((e, i) => (
              <li key={i}>
                <code>{e.type}</code>
                {typeof e.count === "number" && ` (${e.count})`}
                {typeof e.from_cache === "boolean" &&
                  (e.from_cache ? " [cache]" : " [fresh]")}
                {typeof e.message === "string" && ` – ${e.message}`}
              </li>
            ))}
          </ol>
        </section>
      )}

      {summary && (
        <section className="mb-8 border p-4 rounded">
          <h2 className="text-lg font-semibold mb-3">Podsumowanie AI</h2>
          <p className="mb-3">{summary.overview}</p>
          <p className="mb-4">
            <strong>Dlaczego pasuje:</strong> {summary.why_matches_query}
          </p>

          {summary.highlights?.length > 0 && (
            <>
              <h3 className="font-medium mb-2">Highlights</h3>
              <ul className="space-y-2 mb-4">
                {summary.highlights.map((h, i) => (
                  <li key={i}>
                    <strong>{h.title}</strong> – {h.description}{" "}
                    <em className="text-gray-500">[{h.source}]</em>
                  </li>
                ))}
              </ul>
            </>
          )}

          {summary.transport_summary && (
            <>
              <h3 className="font-medium mb-2">Transport</h3>
              <p className="mb-4">{summary.transport_summary}</p>
            </>
          )}

          {summary.local_tips?.length > 0 && (
            <>
              <h3 className="font-medium mb-2">Lokalne wskazówki</h3>
              <ul className="list-disc pl-5 mb-4">
                {summary.local_tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </>
          )}

          {summary.warnings?.length > 0 && (
            <>
              <h3 className="font-medium mb-2">Ostrzeżenia</h3>
              <ul className="list-disc pl-5 mb-4">
                {summary.warnings.map((w, i) => (
                  <li key={i}>⚠️ {w}</li>
                ))}
              </ul>
            </>
          )}

          {summary.best_areas_to_stay?.length > 0 && (
            <>
              <h3 className="font-medium mb-2">Gdzie się zatrzymać</h3>
              <ul className="space-y-2">
                {summary.best_areas_to_stay.map((a, i) => (
                  <li key={i}>
                    <strong>{a.area_name}</strong> – {a.reasoning}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {attractionCount > 0 && (
        <section className="mb-8 border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">
            Atrakcje ({attractionCount})
          </h2>
          <p className="text-sm text-gray-600">
            Atrakcje powiązane z wybranymi aktywnościami zostały przypisane do
            destynacji.
          </p>
        </section>
      )}

      {wikivoyage && (
        <section className="mb-8 border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Wikivoyage</h2>
          <p className="mb-2">{wikivoyage.intro}</p>
          {wikivoyage.sections.getIn && (
            <>
              <h3 className="font-medium mt-3">Dojazd</h3>
              <p className="text-sm whitespace-pre-wrap">
                {wikivoyage.sections.getIn}
              </p>
            </>
          )}
          {wikivoyage.sections.getAround && (
            <>
              <h3 className="font-medium mt-3">Poruszanie się</h3>
              <p className="text-sm whitespace-pre-wrap">
                {wikivoyage.sections.getAround}
              </p>
            </>
          )}
          {wikivoyage.sections.stayHealthy && (
            <>
              <h3 className="font-medium mt-3">Zdrowie</h3>
              <p className="text-sm whitespace-pre-wrap">
                {wikivoyage.sections.stayHealthy}
              </p>
            </>
          )}
        </section>
      )}

      {googlePlaces.length > 0 && (
        <section className="mb-8 border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">
            Lokalne usługi ({googlePlaces.length})
          </h2>
          <ul className="space-y-2 text-sm">
            {googlePlaces.slice(0, 10).map((p) => (
              <li key={p.place_id}>
                <strong>{p.name}</strong>
                {p.rating != null && ` ★ ${p.rating}`}
                {p.address && ` – ${p.address}`}
              </li>
            ))}
          </ul>
        </section>
      )}

      {weather && (
        <section className="mb-8 border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Pogoda</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(weather, null, 2)}
          </pre>
        </section>
      )}

      {destination && (
        <FlightsSection destinationId={destination.id} />
      )}

      {destination && attractions.length > 0 && (
        <HotelsSection
          destinationId={destination.id}
          attractions={attractions}
        />
      )}

      {destination && (
        <TransportSection
          destinationId={destination.id}
          destinationLat={Number(destination.center_lat)}
          destinationLon={Number(destination.center_lon)}
          destinationName={destination.name}
        />
      )}

      {isComplete && (
        <p className="text-green-700 text-sm">
          ✓ Strona kompletna. Następnym razem załaduje się szybciej z cache.
        </p>
      )}
    </div>
  );
}

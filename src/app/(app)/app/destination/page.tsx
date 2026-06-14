"use client";

import { FlightsSection } from "@/components/features/FlightsSection";
import { HotelsSection } from "@/components/features/HotelsSection";
import { TransportSection } from "@/components/features/TransportSection";
import { SaveTripSection } from "@/components/features/SaveTripSection";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LocationDiagram } from "@/components/features/LocationDiagram";
import type { DiagramLine, DiagramPoint } from "@/components/features/LocationDiagram";
import { Breadcrumb, PageContainer } from "@/components/layout/Header";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Attraction, Destination, GeoCluster } from "@/types/domain";
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
  const [cluster, setCluster] = useState<GeoCluster | null>(null);
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

    let parsedCluster: GeoCluster;
    let activities: string[];
    try {
      parsedCluster = JSON.parse(decodeURIComponent(clusterData)) as GeoCluster;
      activities = JSON.parse(decodeURIComponent(activitiesParam));
      setCluster(parsedCluster);
    } catch {
      setError("Nieprawidłowe dane URL");
      return;
    }

    startBuild(parsedCluster, activities);
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
      <PageContainer>
        <h1 className="font-display mb-4 text-2xl font-bold text-text-primary">
          Błąd
        </h1>
        <p className="mb-4 text-danger">{error}</p>
        <Button variant="secondary" onClick={() => router.back()}>
          Wróć
        </Button>
      </PageContainer>
    );
  }

  const diagram = cluster ? buildClusterDiagram(cluster) : null;

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: "Start", href: "/app" },
          { label: "Wyszukiwarka", href: "/app/search" },
          { label: destination?.name ?? "Destynacja" },
        ]}
      />

      <button
        onClick={() => router.push("/app/search")}
        className="mb-4 text-sm text-brand-700 hover:underline"
      >
        ← Wróć do wyszukiwarki
      </button>

      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold text-text-primary">
          {destination?.name ?? "Buduję destynację..."}
        </h1>
        {destination && (
          <p className="mt-2 text-sm text-text-secondary">
            {destination.country_code} · {destination.destination_type} ·{" "}
            {destination.timezone}
          </p>
        )}
      </header>

      {diagram && (
        <section className="mb-8">
          <h2 className="font-display mb-4 text-lg font-bold text-text-primary">
            Mapa regionu
          </h2>
          <LocationDiagram
            points={diagram.points}
            lines={diagram.lines}
            size="md"
          />
        </section>
      )}

      {isBuilding && (
        <Card className="mb-8">
          <CardHeader title="Postęp budowania" />
          <CardBody>
            <ol className="space-y-1 text-sm text-text-secondary">
              {events.map((e, i) => (
                <li key={i}>
                  <code className="text-brand-700">{e.type}</code>
                  {typeof e.count === "number" && ` (${e.count})`}
                  {typeof e.from_cache === "boolean" &&
                    (e.from_cache ? " [cache]" : " [fresh]")}
                  {typeof e.message === "string" && ` – ${e.message}`}
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      )}

      {summary && (
        <Card className="mb-8">
          <CardHeader title="Podsumowanie AI" />
          <CardBody>
          <p className="mb-4 text-text-secondary">{summary.overview}</p>
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
                  <li key={i} className="flex items-start gap-2">
                    <Icon name="alert-triangle" size={14} className="mt-0.5 shrink-0 text-warning" />
                    {w}
                  </li>
                ))}
              </ul>
            </>
          )}

          {summary.best_areas_to_stay?.length > 0 && (
            <>
              <h3 className="mb-2 font-medium text-text-primary">Gdzie się zatrzymać</h3>
              <ul className="space-y-2">
                {summary.best_areas_to_stay.map((a, i) => (
                  <li key={i}>
                    <strong>{a.area_name}</strong> – {a.reasoning}
                  </li>
                ))}
              </ul>
            </>
          )}
          </CardBody>
        </Card>
      )}

      {attractionCount > 0 && (
        <Card className="mb-8">
          <CardHeader title={`Atrakcje (${attractionCount})`} />
          <CardBody>
            <p className="text-sm text-text-secondary">
              Atrakcje powiązane z wybranymi aktywnościami zostały przypisane do
              destynacji.
            </p>
          </CardBody>
        </Card>
      )}

      {wikivoyage && (
        <Card className="mb-8">
          <CardHeader title="Wikivoyage" />
          <CardBody>
            <p className="mb-4 text-text-secondary">{wikivoyage.intro}</p>
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
              <h3 className="mt-3 font-medium text-text-primary">Zdrowie</h3>
              <p className="text-sm whitespace-pre-wrap text-text-secondary">
                {wikivoyage.sections.stayHealthy}
              </p>
            </>
          )}
          </CardBody>
        </Card>
      )}

      {googlePlaces.length > 0 && (
        <Card className="mb-8">
          <CardHeader title={`Lokalne usługi (${googlePlaces.length})`} />
          <CardBody>
            <ul className="space-y-2 text-sm text-text-secondary">
            {googlePlaces.slice(0, 10).map((p) => (
              <li key={p.place_id}>
                <strong>{p.name}</strong>
                {p.rating != null && ` ★ ${p.rating}`}
                {p.address && ` – ${p.address}`}
              </li>
            ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {weather && (
        <Card className="mb-8">
          <CardHeader title="Pogoda" />
          <CardBody>
            <pre className="overflow-auto text-xs text-text-secondary">
              {JSON.stringify(weather, null, 2)}
            </pre>
          </CardBody>
        </Card>
      )}

      {destination && (
        <ErrorBoundary>
          <FlightsSection destinationId={destination.id} />
        </ErrorBoundary>
      )}

      {destination && attractions.length > 0 && (
        <ErrorBoundary>
          <HotelsSection
            destinationId={destination.id}
            attractions={attractions}
          />
        </ErrorBoundary>
      )}

      {destination && (
        <ErrorBoundary>
          <TransportSection
            destinationId={destination.id}
            destinationLat={Number(destination.center_lat)}
            destinationLon={Number(destination.center_lon)}
            destinationName={destination.name}
          />
        </ErrorBoundary>
      )}

      {destination && attractions.length > 0 && (
        <ErrorBoundary>
          <SaveTripSection
            destinationId={destination.id}
            destinationName={destination.name}
            attractions={attractions}
          />
        </ErrorBoundary>
      )}

      {isComplete && (
        <p className="flex items-center gap-2 text-sm text-success">
          <Icon name="check" size={16} />
          Strona kompletna. Następnym razem załaduje się szybciej z cache.
        </p>
      )}
    </PageContainer>
  );
}

function buildClusterDiagram(cluster: GeoCluster): {
  points: DiagramPoint[];
  lines: DiagramLine[];
} {
  const center = cluster.center;
  const attractions = cluster.attractions.slice(0, 8);

  const points: DiagramPoint[] = [
    {
      id: "centroid",
      type: "centroid",
      label: "Centrum regionu",
      lat: center.lat,
      lon: center.lon,
    },
    ...attractions.map((a) => ({
      id: a.id,
      type: "attraction" as const,
      label: a.name.length > 24 ? `${a.name.slice(0, 24)}…` : a.name,
      lat: Number(a.lat),
      lon: Number(a.lon),
    })),
  ];

  const lines: DiagramLine[] = attractions.map((a) => ({
    from: "centroid",
    to: a.id,
    distance_km: distanceKm(center, { lat: Number(a.lat), lon: Number(a.lon) }),
  }));

  return { points, lines };
}

function distanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 10) / 10;
}

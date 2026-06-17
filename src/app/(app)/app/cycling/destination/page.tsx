"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Breadcrumb, PageContainer } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { SkeletonList } from "@/components/ui/Skeleton";
import { CyclingDestinationView } from "@/components/activities/cycling/CyclingDestinationView";
import { CYCLING_TAXONOMY_SLUGS } from "@/lib/activities/cycling/constants";
import {
  loadDestinationBuildPayload,
  applyPlanToCluster,
  storeDestinationBuildPayload,
  type DestinationBuildPayload,
} from "@/lib/search/destination-build-payload";
import {
  defaultTripContext,
  mergeTripContext,
  tripContextFromParams,
  tripContextToParams,
} from "@/lib/search/trip-context";
import type { CyclingDestinationSummary } from "@/lib/synthesis/cycling-destination-summary";
import type { Destination, GeoCluster } from "@/types/domain";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type BuildEvent = {
  type: string;
  [key: string]: unknown;
};

function parseSseEvents(buffer: string): {
  events: BuildEvent[];
  rest: string;
} {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  const events: BuildEvent[] = [];

  for (const part of parts) {
    const line = part.trim();
    if (!line.startsWith("data: ")) continue;
    try {
      events.push(JSON.parse(line.substring(6)) as BuildEvent);
    } catch {
      console.error("Failed to parse SSE event:", line);
    }
  }

  return { events, rest };
}

function parseTrailingSseEvent(buffer: string): BuildEvent | null {
  const line = buffer.trim();
  if (!line.startsWith("data: ")) return null;
  try {
    return JSON.parse(line.substring(6)) as BuildEvent;
  } catch {
    return null;
  }
}

function isCyclingSummary(value: unknown): value is CyclingDestinationSummary {
  return (
    typeof value === "object" &&
    value !== null &&
    "why_good_for_cycling" in value
  );
}

export default function CyclingDestinationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [cluster, setCluster] = useState<GeoCluster | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [summary, setSummary] = useState<CyclingDestinationSummary | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const buildId = searchParams.get("build_id");
  const clusterData = searchParams.get("cluster");
  const activitiesParam = searchParams.get("activities");

  const trip = useMemo(
    () =>
      mergeTripContext(
        defaultTripContext(),
        tripContextFromParams(searchParams),
      ),
    [searchParams],
  );

  const pageTitle =
    destination?.name ??
    cluster?.settlement?.name ??
    trip.destination_label ??
    "Region rowerowy";

  useEffect(() => {
    if (startedRef.current) return;

    let parsedCluster: GeoCluster | null = null;
    let activities: string[] = [...CYCLING_TAXONOMY_SLUGS];
    let storedPayload: DestinationBuildPayload | null = null;

    if (buildId) {
      storedPayload = loadDestinationBuildPayload(buildId);
      if (storedPayload) {
        parsedCluster = storedPayload.cluster;
        activities = storedPayload.activities;
      }
    }

    if (!parsedCluster && clusterData && activitiesParam) {
      try {
        parsedCluster = JSON.parse(
          decodeURIComponent(clusterData),
        ) as GeoCluster;
        activities = JSON.parse(decodeURIComponent(activitiesParam)) as string[];
      } catch {
        setError("Nieprawidłowe dane URL");
        return;
      }
    }

    if (!parsedCluster) {
      setError(
        "Brak danych regionu — wróć do wyszukiwarki i wybierz bazę kolarską",
      );
      return;
    }

    startedRef.current = true;
    const cyclingPayload: DestinationBuildPayload = {
      ...(storedPayload ?? {
        cluster: parsedCluster,
        activities,
        attractionPool: parsedCluster.attractions,
      }),
      planComplete: true,
      selectedAttractionIds: [],
    };

    if (buildId) {
      storeDestinationBuildPayload(buildId, cyclingPayload);
    }

    setCluster(applyPlanToCluster(cyclingPayload));
    void startBuild(parsedCluster, activities);
  }, [buildId, clusterData, activitiesParam]);

  function handleEvent(event: BuildEvent) {
    if (event.type === "destination_ready") {
      setDestination(event.destination as Destination);
    } else if (event.type === "ai_synthesis_loaded") {
      const s = event.summary;
      if (isCyclingSummary(s)) {
        setSummary(s);
      }
    } else if (event.type === "error") {
      const step = String(event.step ?? "");
      const message = String(event.message ?? "Błąd budowania");
      if (
        step === "destination_create" ||
        step === "cache_miss" ||
        step === "pipeline"
      ) {
        setError(message);
      }
    }
  }

  async function startBuild(cluster: GeoCluster, activities: string[]) {
    setError(null);
    setIsBuilding(true);

    try {
      const response = await fetch("/api/destination/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cluster,
          selected_activities: activities,
          mode: "cycling",
          trip: {
            date_from: trip.departure_date,
            date_to: trip.return_date ?? trip.departure_date,
          },
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
        const parsed = parseSseEvents(buffer);
        buffer = parsed.rest;
        for (const event of parsed.events) {
          handleEvent(event);
        }
      }

      buffer += decoder.decode();
      const tail = parseTrailingSseEvent(buffer);
      if (tail) handleEvent(tail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsBuilding(false);
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

  const center = destination
    ? {
        lat: Number(destination.center_lat),
        lng: Number(destination.center_lon),
      }
    : cluster
      ? { lat: cluster.center.lat, lng: cluster.center.lon }
      : null;

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: "Start", href: "/app" },
          { label: "Regiony rowerowe", href: "/app/search?activity=cycling&step=7" },
          { label: pageTitle },
        ]}
      />

      <button
        onClick={() => {
          const params = tripContextToParams(trip);
          params.set("step", "7");
          router.push(`/app/search?${params.toString()}`);
        }}
        className="mb-6 text-sm text-brand-700 hover:underline"
      >
        ← Zmień region lub filtry
      </button>

      {!destination && isBuilding && (
        <Card className="mb-8">
          <CardBody>
            <SkeletonList count={4} />
            <p className="mt-4 text-sm text-text-secondary">
              Ładujemy trasy i opis regionu pod kolarstwo…
            </p>
          </CardBody>
        </Card>
      )}

      {destination && center && (
        <ErrorBoundary>
          <CyclingDestinationView
            destinationId={destination.id}
            destinationName={destination.name}
            destinationCenter={center}
            countryCode={destination.country_code}
            summary={summary}
            summaryLoading={isBuilding && !summary}
          />
        </ErrorBoundary>
      )}
    </PageContainer>
  );
}

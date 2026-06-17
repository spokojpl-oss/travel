"use client";

import { FlightsSection } from "@/components/features/FlightsSection";
import { HotelsSection } from "@/components/features/HotelsSection";
import { TransportSection } from "@/components/features/TransportSection";
import { SaveTripSection } from "@/components/features/SaveTripSection";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RegionMap } from "@/components/features/RegionMap";
import { buildClusterMapData } from "@/lib/maps/build-cluster-map";
import { Breadcrumb, PageContainer } from "@/components/layout/Header";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SkeletonList } from "@/components/ui/Skeleton";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Attraction, Destination, GeoCluster } from "@/types/domain";
import type { DestinationSummary } from "@/lib/synthesis/destination-summary";
import type { GooglePlace } from "@/lib/api/google-places";
import { storeSearchRestoreState } from "@/lib/search/search-restore";
import {
  defaultTripContext,
  mergeTripContext,
  tripContextFromParams,
  tripContextToParams,
} from "@/lib/search/trip-context";
import { loadDestinationBuildPayload, applyPlanToCluster, storeDestinationBuildPayload, type DestinationBuildPayload } from "@/lib/search/destination-build-payload";
import { DestinationPlanWizard } from "@/components/features/DestinationPlanWizard";
import { toPolishAttractionName } from "@/lib/plan/attraction-display-name";
import { hasChildrenInPassengers } from "@/lib/search/trip-rhythm";
import { resolveFlightOriginsFromTrip } from "@/lib/flights/polish-airports";
import { parsePassengers } from "@/components/ui/PassengerSelector";
import { LocalServicesSection } from "@/components/features/LocalServicesSection";
import { ActivityPanel } from "@/components/activities/ActivityPanel";
import { CYCLING_TAXONOMY_SLUGS } from "@/lib/activities/cycling/constants";

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

export default function DestinationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [cluster, setCluster] = useState<GeoCluster | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [buildTitle, setBuildTitle] = useState<string | null>(null);
  const [summary, setSummary] = useState<DestinationSummary | null>(null);
  const [googlePlaces, setGooglePlaces] = useState<GooglePlace[]>([]);
  const [attractions, setAttractions] = useState<
    Pick<Attraction, "id" | "name">[]
  >([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [buildWarnings, setBuildWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [planPayload, setPlanPayload] = useState<DestinationBuildPayload | null>(
    null,
  );
  const [planEnriching, setPlanEnriching] = useState(false);
  const [planComplete, setPlanComplete] = useState(false);
  const startedRef = useRef(false);

  const buildId = searchParams.get("build_id");
  const clusterData = searchParams.get("cluster");
  const activitiesParam = searchParams.get("activities");
  const activityMode = searchParams.get("activity") ?? undefined;
  const isCyclingMode = activityMode === "cycling";

  const trip = useMemo(
    () =>
      mergeTripContext(
        defaultTripContext(),
        tripContextFromParams(searchParams),
      ),
    [searchParams],
  );
  const passengers = useMemo(
    () => parsePassengers(trip.passengers),
    [trip.passengers],
  );
  const flightOrigins = useMemo(
    () => resolveFlightOriginsFromTrip(trip),
    [trip.origin_iata, trip.origin_scope],
  );

  function navigateToSearchStep(
    targetStep: number,
    options?: { rerunSearch?: boolean },
  ) {
    const activities = planPayload?.activities ?? [];
    if (activities.length > 0) {
      storeSearchRestoreState({
        activities,
        step: targetStep,
        rerunSearch: options?.rerunSearch,
      });
    }
    const params = tripContextToParams(trip);
    params.set("step", String(targetStep));
    if (buildId) params.set("build_id", buildId);
    router.push(`/app/search?${params.toString()}`);
  }

  const skipRegionsStep = planPayload?.explorationScope === "island";

  const clusterAttractions = useMemo(
    () =>
      cluster?.attractions.map((a) => ({
        id: a.id,
        name: toPolishAttractionName(a.name),
      })) ?? [],
    [cluster],
  );
  const hotelsAttractions =
    attractions.length > 0 ? attractions : clusterAttractions;

  useEffect(() => {
    if (startedRef.current) return;

    let parsedCluster: GeoCluster | null = null;
    let activities: string[] | null = null;
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
        storedPayload = {
          cluster: parsedCluster,
          activities,
          attractionPool: parsedCluster.attractions,
        };
      } catch {
        setError("Nieprawidłowe dane URL");
        return;
      }
    }

    if (!parsedCluster || !activities?.length) {
      if (isCyclingMode) {
        activities = [...CYCLING_TAXONOMY_SLUGS];
        if (!parsedCluster) {
          setError(
            "Brak danych regionu — wróć do wyszukiwarki i wybierz region ponownie",
          );
          return;
        }
      } else {
        setError(
          "Brak danych regionu — wróć do wyszukiwarki i wybierz region ponownie",
        );
        return;
      }
    }

    startedRef.current = true;
    setSelectedActivities(activities);

    const basePayload =
      storedPayload ?? {
        cluster: parsedCluster,
        activities,
        attractionPool: parsedCluster.attractions,
      };

    if (isCyclingMode && !basePayload.planComplete) {
      const cyclingPayload: DestinationBuildPayload = {
        ...basePayload,
        planComplete: true,
        selectedAttractionIds: [],
      };
      const finalCluster = applyPlanToCluster(cyclingPayload);
      if (buildId) {
        storeDestinationBuildPayload(buildId, cyclingPayload);
      }
      setPlanPayload(cyclingPayload);
      setPlanComplete(true);
      setCluster(finalCluster);
      void startBuild(finalCluster, activities);
      return;
    }

    if (storedPayload?.planComplete) {
      const finalCluster = applyPlanToCluster(storedPayload);
      setPlanPayload(storedPayload);
      setPlanComplete(true);
      setCluster(finalCluster);
      void startBuild(finalCluster, activities);
      return;
    }

    setPlanPayload(
      storedPayload ?? {
        cluster: parsedCluster,
        activities,
        attractionPool: parsedCluster.attractions,
      },
    );
    setCluster(parsedCluster);
  }, [buildId, clusterData, activitiesParam, isCyclingMode]);

  useEffect(() => {
    if (!planPayload || planPayload.planComplete || planPayload.poolEnriched) {
      return;
    }

    let cancelled = false;
    setPlanEnriching(true);

    void (async () => {
      try {
        const response = await fetch("/api/search/plan-pool", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cluster: planPayload.cluster,
            activities: planPayload.activities,
            destination_label: planPayload.destinationLabel,
            tourist_region_id: planPayload.touristRegionId ?? trip.tourist_region_id,
            tourist_region_ids:
              planPayload.touristRegionIds ?? trip.tourist_region_ids,
            exploration_scope:
              planPayload.explorationScope ?? trip.exploration_scope,
            stay_radius_km: planPayload.stayRadiusKm,
            explore_radius_km: planPayload.exploreRadiusKm,
            departure_date: trip.departure_date,
            return_date: trip.return_date,
            with_kids: hasChildrenInPassengers(trip.passengers),
            locale: "pl",
            region_context: planPayload.region ?? null,
          }),
        });

        if (!response.ok || cancelled) return;

        const data = (await response.json()) as {
          cluster: GeoCluster;
          attractionPool: DestinationBuildPayload["attractionPool"];
          discover?: DestinationBuildPayload["discover"];
          tripDays?: number;
          explorationScope?: string;
          stayRadiusKm?: number;
          exploreRadiusKm?: number;
        };

        if (cancelled) return;

        const enriched: DestinationBuildPayload = {
          ...planPayload,
          cluster: data.cluster,
          attractionPool: data.attractionPool,
          discover: data.discover,
          tripDays: data.tripDays,
          explorationScope:
            data.explorationScope ??
            planPayload.explorationScope ??
            trip.exploration_scope,
          stayRadiusKm: data.stayRadiusKm ?? planPayload.stayRadiusKm,
          exploreRadiusKm: data.exploreRadiusKm ?? planPayload.exploreRadiusKm,
          poolEnriched: true,
        };

        setPlanPayload(enriched);
        setCluster(data.cluster);
        if (buildId) {
          storeDestinationBuildPayload(buildId, enriched);
        }
      } catch {
        /* wizard działa na surowym poolu */
      } finally {
        if (!cancelled) setPlanEnriching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [planPayload, trip, buildId]);

  function handlePlanComplete(updated: DestinationBuildPayload) {
    const finalCluster = applyPlanToCluster(updated);
    if (buildId) {
      storeDestinationBuildPayload(buildId, updated);
    }
    setPlanPayload(updated);
    setPlanComplete(true);
    setCluster(finalCluster);
    void startBuild(finalCluster, updated.activities);
  }

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

  function handleEvent(event: BuildEvent) {
    if (event.type === "started") {
      setBuildTitle(String(event.destination_name ?? ""));
    } else if (event.type === "destination_ready") {
      setDestination(event.destination as Destination);
    } else if (event.type === "google_places_loaded") {
      setGooglePlaces((event.places as GooglePlace[]) ?? []);
    } else if (event.type === "ai_synthesis_loaded") {
      setSummary(event.summary as DestinationSummary);
    } else if (event.type === "error") {
      const step = String(event.step ?? "");
      const message = String(event.message ?? "Błąd budowania");
      if (
        step === "destination_create" ||
        step === "cache_miss" ||
        step === "pipeline"
      ) {
        setError(message);
      } else {
        setBuildWarnings((prev) => [...prev, message]);
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
          trip: {
            date_from: trip.departure_date,
            date_to: trip.return_date ?? trip.departure_date,
            adults: passengers.adults,
            children_ages: passengers.childAges,
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

      setIsComplete(true);
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

  const mapData =
    cluster && planComplete ? buildClusterMapData(cluster) : null;
  const pageTitle =
    destination?.name ??
    buildTitle ??
    planPayload?.lodgingBase?.name ??
    planPayload?.region?.name_pl ??
    cluster?.settlement?.name ??
    (planComplete ? "Przygotowujemy ofertę…" : "Zaplanuj wyjazd");

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: "Start", href: "/app" },
          { label: "Wyszukiwarka", href: "/app/search" },
          { label: pageTitle },
        ]}
      />

      <button
        onClick={() => navigateToSearchStep(7, { rerunSearch: true })}
        className="mb-4 text-sm text-brand-700 hover:underline"
      >
        ← Wróć do wyników wyszukiwania
      </button>

      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold text-text-primary">
          {pageTitle}
        </h1>
        {isCyclingMode && (
          <p className="mt-2 text-sm font-medium text-brand-700">Kolarstwo</p>
        )}
        {destination && (
          <p className="mt-2 text-sm text-text-secondary">
            {destination.country_code} · {destination.destination_type} ·{" "}
            {destination.timezone}
          </p>
        )}
        {isBuilding && !destination && planComplete && (
          <p className="mt-2 text-sm text-text-secondary">
            Przygotowujemy opis, pogodę i oferty podróży…
          </p>
        )}
      </header>

      {planComplete && destination && isCyclingMode && (
        <section className="mb-8">
          <ActivityPanel
            activity={activityMode}
            destinationId={destination.id}
            destinationCenter={{
              lat: Number(destination.center_lat),
              lng: Number(destination.center_lon),
            }}
          />
        </section>
      )}

      {!isCyclingMode && !planComplete && planPayload && !planEnriching && (
        <DestinationPlanWizard
          payload={planPayload}
          withKids={hasChildrenInPassengers(trip.passengers)}
          onComplete={handlePlanComplete}
          onCancel={() => navigateToSearchStep(7, { rerunSearch: true })}
          onBackToActivities={() => navigateToSearchStep(6)}
          onBackToRegions={
            skipRegionsStep ? undefined : () => navigateToSearchStep(5)
          }
          onBackToResults={() => navigateToSearchStep(7, { rerunSearch: true })}
        />
      )}

      {!isCyclingMode && !planComplete && planEnriching && (
        <Card>
          <CardBody>
            <SkeletonList count={4} />
            <p className="mt-4 text-sm text-text-secondary">
              Ładujemy miejsca z opisami — plaże, wycieczki i to, co warto zobaczyć…
            </p>
          </CardBody>
        </Card>
      )}

      {!isCyclingMode && planComplete && mapData && (
        <section className="mb-8">
          <h2 className="font-display mb-4 text-lg font-bold text-text-primary">
            Mapa regionu
          </h2>
          <RegionMap points={mapData.points} segments={mapData.segments} />
        </section>
      )}

      {planComplete && isCyclingMode && !destination && (
        <Card className="mb-8">
          <CardBody className="text-sm text-text-secondary">
            <p>Ładujemy trasy rowerowe dla tej destynacji…</p>
          </CardBody>
        </Card>
      )}

      {planComplete && buildWarnings.length > 0 && (
        <Card className="mb-8 border-warning/40 bg-orange-50/60">
          <CardBody className="text-sm text-text-secondary">
            <p className="font-medium text-text-primary">
              Część danych niedostępna
            </p>
            <ul className="mt-2 list-disc pl-5">
              {buildWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {planComplete && !isCyclingMode && summary && (
        <Card className="mb-8">
          <CardHeader title="Podsumowanie" />
          <CardBody>
            <p className="mb-4 text-text-secondary">{summary.overview}</p>
            <p className="mb-4">
              <strong>Dlaczego pasuje:</strong> {summary.why_matches_query}
            </p>

            {summary.highlights?.length > 0 && (
              <>
                <h3 className="mb-2 font-medium">Highlights</h3>
                <ul className="mb-4 space-y-2">
                  {summary.highlights.map((h, i) => (
                    <li key={i}>
                      <strong>{h.title}</strong> – {h.description}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {summary.transport_summary && (
              <>
                <h3 className="mb-2 font-medium">Transport</h3>
                <p className="mb-4">{summary.transport_summary}</p>
              </>
            )}

            {summary.local_tips?.length > 0 && (
              <>
                <h3 className="mb-2 font-medium">Lokalne wskazówki</h3>
                <ul className="mb-4 list-disc pl-5">
                  {summary.local_tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </>
            )}

            {summary.warnings?.length > 0 && (
              <>
                <h3 className="mb-2 font-medium">Ostrzeżenia</h3>
                <ul className="mb-4 list-disc pl-5">
                  {summary.warnings.map((w, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Icon
                        name="alert-triangle"
                        size={14}
                        className="mt-0.5 shrink-0 text-warning"
                      />
                      {w}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {summary.best_areas_to_stay?.length > 0 && (
              <>
                <h3 className="mb-2 font-medium text-text-primary">
                  Gdzie się zatrzymać
                </h3>
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

      {planComplete && isBuilding && !summary && (
        <Card className="mb-8">
          <CardHeader title="Podsumowanie" />
          <CardBody>
            <SkeletonList count={4} />
          </CardBody>
        </Card>
      )}

      {planComplete && !isCyclingMode && googlePlaces.length > 0 && selectedActivities.length > 0 && (
        <LocalServicesSection
          places={googlePlaces}
          selectedActivities={selectedActivities}
        />
      )}

      {planComplete && destination && trip.travel_mode === "flight" && (
        <ErrorBoundary>
          <FlightsSection
            destinationId={destination.id}
            departureDate={trip.departure_date}
            returnDate={trip.return_date}
            origins={flightOrigins}
            adults={passengers.adults}
            children={passengers.children}
          />
        </ErrorBoundary>
      )}

      {planComplete && isBuilding && !destination && trip.travel_mode === "flight" && (
        <Card className="mb-8">
          <CardHeader title="Loty" />
          <CardBody>
            <SkeletonList count={3} />
          </CardBody>
        </Card>
      )}

      {planComplete && destination && hotelsAttractions.length > 0 && (
        <ErrorBoundary>
          <HotelsSection
            destinationId={destination.id}
            attractions={hotelsAttractions}
            checkIn={trip.departure_date}
            checkOut={trip.return_date ?? undefined}
            adults={passengers.adults}
            childrenAges={passengers.childAges}
          />
        </ErrorBoundary>
      )}

      {planComplete &&
        destination &&
        (trip.travel_mode === "flight" ||
          (trip.travel_mode === "car" && trip.vehicle_source === "rental")) && (
          <ErrorBoundary>
            <TransportSection
              destinationId={destination.id}
              destinationLat={Number(destination.center_lat)}
              destinationLon={Number(destination.center_lon)}
              destinationName={destination.name}
              pickupDate={trip.departure_date}
              returnDate={trip.return_date ?? undefined}
              adults={passengers.adults}
              childrenAges={passengers.childAges}
            />
          </ErrorBoundary>
        )}

      {planComplete && destination && hotelsAttractions.length > 0 && (
        <ErrorBoundary>
          <SaveTripSection
            destinationId={destination.id}
            destinationName={destination.name}
            attractions={hotelsAttractions}
          />
        </ErrorBoundary>
      )}

      {planComplete && isComplete && destination && (
        <p className="flex items-center gap-2 text-sm text-success">
          <Icon name="check" size={16} />
          Strona kompletna. Następnym razem załaduje się szybciej z cache.
        </p>
      )}

      {planComplete && isComplete && !destination && (
        <Card className="border-danger/30 bg-orange-50/60">
          <CardBody className="text-sm text-text-secondary">
            <p className="font-medium text-text-primary">
              Nie udało się utworzyć destynacji
            </p>
            <p className="mt-2">
              Mapa regionu jest dostępna, ale loty i hotele wymagają zapisu
              destynacji w bazie. Spróbuj odświeżyć stronę lub wróć do
              wyszukiwarki.
            </p>
            <Button
              className="mt-4"
              variant="secondary"
              onClick={() => {
                startedRef.current = false;
                setIsComplete(false);
                if (cluster && selectedActivities.length > 0) {
                  void startBuild(cluster, selectedActivities);
                }
              }}
            >
              Spróbuj ponownie
            </Button>
          </CardBody>
        </Card>
      )}
    </PageContainer>
  );
}

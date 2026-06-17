"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RegionMap } from "@/components/features/RegionMap";
import { WhatToSeeStep } from "@/components/features/WhatToSeeStep";
import { cn } from "@/lib/utils/cn";
import { buildClusterMapData } from "@/lib/maps/build-cluster-map";
import {
  applyPlanMetaToPool,
} from "@/lib/plan/build-plan-pool";
import {
  resolvePlaceSelectionToPoolIds,
  resolveSelectedCardsToAttractions,
  selectedPlaceMapPoints,
  buildDiscoverPlaces,
  type PlaceCard,
} from "@/lib/plan/build-discover-places";
import { injectCuratedPicksForRegions } from "@/lib/plan/curated-day-trips";
import { centroidOfTouristRegions } from "@/lib/plan/tourist-region-anchor";
import { matchingRegionsForDestination } from "@/lib/plan/destination-story";
import { SEED_TOURIST_REGIONS } from "@/lib/destinations/tourist-regions-seed";
import {
  computeLodgingAreaOptions,
  lodgingDistancesFromArea,
  type LodgingAreaOption,
} from "@/lib/plan/lodging-sub-areas";
import { LodgingBaseMap } from "@/components/features/LodgingBaseMap";
import {
  defaultExplorationScope,
  explorationScopeFromString,
  type ExplorationScope,
} from "@/lib/search/exploration-scope";
import type { DestinationBuildPayload } from "@/lib/search/destination-build-payload";
import { cyclingRoutesToMapOverlays } from "@/lib/maps/cycling-route-overlays";
import {
  assessCyclingTripLogistics,
  beachAttractionsFromPool,
  buildCyclingLodgingOptions,
  enhanceDiscoverForCycling,
  scoreCyclingLodgingOption,
  type CyclingTripAdvice,
} from "@/lib/plan/cycling-plan";
import { useLocale } from "@/i18n/locale-provider";
import type { GeoCluster } from "@/types/domain";

type WizardStep = "discover" | "base" | "plan";

export function DestinationPlanWizard({
  payload,
  withKids,
  onComplete,
  onCancel,
  onBackToActivities,
  onBackToRegions,
  onBackToResults,
}: {
  payload: DestinationBuildPayload;
  withKids?: boolean;
  locale?: "pl" | "en";
  onComplete: (updated: DestinationBuildPayload) => void;
  onCancel?: () => void;
  onBackToActivities?: () => void;
  onBackToRegions?: () => void;
  onBackToResults?: () => void;
}) {
  const { locale } = useLocale();
  const pl = locale !== "en";

  const rawPool = payload.attractionPool;

  const matchedRegions = useMemo(
    () =>
      matchingRegionsForDestination(
        SEED_TOURIST_REGIONS,
        payload.destinationLabel ?? "",
        payload.touristRegionId,
        payload.touristRegionIds,
      ),
    [
      payload.destinationLabel,
      payload.touristRegionId,
      payload.touristRegionIds,
    ],
  );

  const enrichedPool = useMemo(() => {
    if (matchedRegions.length === 0) return rawPool;
    return injectCuratedPicksForRegions({
      catalog: SEED_TOURIST_REGIONS,
      regionIds: matchedRegions.map((r) => r.id),
      existingPool: rawPool,
      locale,
    });
  }, [rawPool, matchedRegions, locale]);

  const planAnchor = useMemo(() => {
    if (matchedRegions.length > 0) {
      return centroidOfTouristRegions(matchedRegions) ?? payload.cluster.center;
    }
    return payload.cluster.center;
  }, [matchedRegions, payload.cluster.center]);

  const discover = useMemo(() => {
    if (payload.discover) return payload.discover;
    return buildDiscoverPlaces({
      pool: enrichedPool,
      catalog: SEED_TOURIST_REGIONS,
      destinationLabel: payload.destinationLabel ?? "",
      touristRegionId: payload.touristRegionId,
      touristRegionIds: payload.touristRegionIds,
      regionContext: payload.region,
      preferredActivities: payload.activities,
      locale,
      tripDays: payload.tripDays ?? 5,
      explorationScope:
        explorationScopeFromString(payload.explorationScope ?? null) ??
        defaultExplorationScope(),
      referencePoint: planAnchor,
      withKids,
      stayRadiusKm: payload.stayRadiusKm,
    });
  }, [payload, enrichedPool, locale, withKids, planAnchor, matchedRegions.length]);

  const placeCards = discover.placeCards;
  const story = discover.story;

  const explorationScope: ExplorationScope =
    explorationScopeFromString(payload.explorationScope ?? null) ??
    defaultExplorationScope();
  const tripDays = payload.tripDays ?? 5;
  const cyclingRoutes = payload.selectedCyclingRoutes ?? [];
  const isCyclingMode = Boolean(payload.isCycling || cyclingRoutes.length > 0);

  const beachAttractions = useMemo(
    () =>
      beachAttractionsFromPool(
        enrichedPool,
        payload.activities,
        matchedRegions,
      ),
    [enrichedPool, payload.activities, matchedRegions],
  );

  const cyclingAdvice = useMemo((): CyclingTripAdvice | null => {
    if (!isCyclingMode || matchedRegions.length < 2) return null;
    return assessCyclingTripLogistics({
      regions: matchedRegions,
      routes: cyclingRoutes,
      tripDays,
      hasRentalCar: payload.hasRentalCar,
      beachCount: beachAttractions.length,
    });
  }, [
    isCyclingMode,
    matchedRegions,
    cyclingRoutes,
    tripDays,
    payload.hasRentalCar,
    beachAttractions.length,
  ]);

  const cyclingDiscover = useMemo(() => {
    if (!isCyclingMode) {
      return {
        placeCards,
        suggestedIds: discover.suggestedIds,
      };
    }
    return enhanceDiscoverForCycling({
      discover,
      routes: cyclingRoutes,
      beaches: beachAttractions,
      regions: matchedRegions,
    });
  }, [
    isCyclingMode,
    discover,
    cyclingRoutes,
    beachAttractions,
    matchedRegions,
    placeCards,
  ]);

  const effectivePlaceCards = isCyclingMode
    ? cyclingDiscover.placeCards
    : placeCards;

  const [step, setStep] = useState<WizardStep>("discover");
  const [baseChoice, setBaseChoice] = useState<string | null>(
    payload.lodgingBase?.areaId ?? payload.lodgingBase?.choice ?? null,
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (payload.selectedAttractionIds?.length) {
      return new Set(payload.selectedAttractionIds);
    }
    if (discover.suggestedIds?.length) {
      return new Set(discover.suggestedIds);
    }
    return new Set(
      placeCards.filter((c) => c.recommended).slice(0, 6).map((c) => c.id),
    );
  });

  /** Po enrich z API — przełącz sugestie na pool ograniczony do rejonu (nie trzymaj starych ID z całej wyspy). */
  useEffect(() => {
    if (!payload.poolEnriched || payload.selectedAttractionIds?.length) return;
    const ids = isCyclingMode
      ? cyclingDiscover.suggestedIds
      : payload.discover?.suggestedIds;
    if (!ids?.length) return;
    setSelectedIds(new Set(ids));
  }, [
    payload.poolEnriched,
    payload.discover?.suggestedIds,
    payload.selectedAttractionIds,
    isCyclingMode,
    cyclingDiscover.suggestedIds,
  ]);

  const selectedPoolIds = useMemo(
    () =>
      resolvePlaceSelectionToPoolIds(
        [...selectedIds],
        enrichedPool,
        effectivePlaceCards,
        matchedRegions,
      ),
    [selectedIds, enrichedPool, effectivePlaceCards, matchedRegions],
  );

  const selectedPlaces = useMemo(
    () =>
      resolveSelectedCardsToAttractions(
        selectedIds,
        enrichedPool,
        effectivePlaceCards,
        matchedRegions,
      ),
    [selectedIds, enrichedPool, effectivePlaceCards, matchedRegions],
  );

  const selectedAttractions = selectedPlaces;

  const baseOptions = useMemo(() => {
    if (isCyclingMode && matchedRegions.length > 0) {
      return buildCyclingLodgingOptions(matchedRegions, {
        attractions:
          selectedAttractions.length > 0 ? selectedAttractions : rawPool,
        locale,
        stayRadiusKm: payload.stayRadiusKm,
        routes: cyclingRoutes,
      });
    }

    const fromRegions = computeLodgingAreaOptions(matchedRegions, {
      attractions:
        selectedAttractions.length > 0 ? selectedAttractions : rawPool,
      locale,
      stayRadiusKm: payload.stayRadiusKm,
    });
    if (fromRegions.length > 0) return fromRegions;

    if (payload.region) {
      const r = payload.region;
      return [
        {
          id: r.id ?? "custom-region",
          lat: payload.cluster.center.lat,
          lon: payload.cluster.center.lon,
          name: pl ? r.name_pl : r.name_en,
          description_pl: r.stay_hint_pl,
          description_en: r.stay_hint_en,
          radiusKm: payload.stayRadiusKm ?? 5,
          parentRegion: {
            id: r.id ?? "custom-region",
            name_pl: r.name_pl,
            name_en: r.name_en,
            overview_pl: r.overview_pl,
            overview_en: r.overview_en,
            stay_hint_pl: r.stay_hint_pl,
            stay_hint_en: r.stay_hint_en,
          },
        },
      ];
    }

    return [];
  }, [
    isCyclingMode,
    cyclingRoutes,
    matchedRegions,
    selectedAttractions,
    rawPool,
    locale,
    payload.stayRadiusKm,
    payload.region,
    payload.cluster.center,
    pl,
  ]);

  const lodgingScores = useMemo(() => {
    if (!isCyclingMode) return new Map<string, ReturnType<typeof scoreCyclingLodgingOption>>();
    const scores = baseOptions.map((o) =>
      scoreCyclingLodgingOption(
        o,
        cyclingRoutes,
        beachAttractions,
        matchedRegions,
        locale,
      ),
    );
    return new Map(scores.map((s) => [s.option.id, s]));
  }, [
    isCyclingMode,
    baseOptions,
    cyclingRoutes,
    beachAttractions,
    matchedRegions,
    locale,
  ]);

  useEffect(() => {
    if (!isCyclingMode || baseChoice || baseOptions.length === 0) return;
    setBaseChoice(baseOptions[0]!.id);
  }, [isCyclingMode, baseChoice, baseOptions]);

  const selectedBase = baseOptions.find((o) => o.id === baseChoice);

  const primaryRegionOverview = useMemo(() => {
    if (matchedRegions.length === 0) return null;
    const r = matchedRegions[0]!;
    return {
      name: pl ? r.name_pl : r.name_en,
      overview: pl ? r.overview_pl : r.overview_en,
      areaLabel: pl ? r.area_label_pl : r.area_label_en,
    };
  }, [matchedRegions, pl]);

  const lodgingDistances = useMemo(() => {
    if (!selectedBase) return null;
    return lodgingDistancesFromArea(
      selectedBase,
      selectedAttractions,
      payload.airports ?? [],
    );
  }, [selectedBase, selectedAttractions, payload.airports]);

  const mapAttractions = useMemo(
    () => selectedPlaceMapPoints(selectedIds, effectivePlaceCards),
    [selectedIds, effectivePlaceCards],
  );

  const poolWithMeta = useMemo(() => {
    if (!selectedBase) return enrichedPool;
    return applyPlanMetaToPool(
      enrichedPool,
      { lat: selectedBase.lat, lon: selectedBase.lon },
      explorationScope,
      tripDays,
    );
  }, [enrichedPool, selectedBase, explorationScope, tripDays]);

  const draftCluster: GeoCluster = useMemo(() => {
    const base = selectedBase;
    const selectedFromPool = poolWithMeta.filter((a) =>
      selectedPoolIds.includes(a.id),
    );
    const mergedById = new Map(selectedFromPool.map((a) => [a.id, a]));
    for (const place of selectedPlaces) {
      if (!mergedById.has(place.id)) mergedById.set(place.id, place);
    }
    return {
      ...payload.cluster,
      center: base
        ? { lat: base.lat, lon: base.lon }
        : payload.cluster.center,
      settlement: base
        ? { name: base.name, lat: base.lat, lon: base.lon }
        : payload.cluster.settlement,
      attractions: [...mergedById.values()],
    };
  }, [payload.cluster, poolWithMeta, selectedBase, selectedPoolIds, selectedPlaces]);

  const mapData = useMemo(
    () =>
      buildClusterMapData(draftCluster, [], {
        locale,
        attractionPool: poolWithMeta,
      }),
    [draftCluster, locale, poolWithMeta],
  );

  const cyclingMapRoutes = useMemo(
    () => cyclingRoutesToMapOverlays(payload.selectedCyclingRoutes ?? []),
    [payload.selectedCyclingRoutes],
  );

  function togglePlace(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectRecommended() {
    const ids = effectivePlaceCards.filter((c) => c.recommended).map((c) => c.id);
    if (isCyclingMode && cyclingDiscover.suggestedIds.length) {
      setSelectedIds(new Set(cyclingDiscover.suggestedIds));
    } else if (discover.suggestedIds?.length) {
      setSelectedIds(new Set(discover.suggestedIds));
    } else {
      setSelectedIds(new Set(ids));
    }
  }

  function confirmPlan() {
    if (!selectedBase) return;
    if (selectedIds.size === 0 && cyclingMapRoutes.length === 0) return;
    onComplete({
      ...payload,
      lodgingBase: {
        lat: selectedBase.lat,
        lon: selectedBase.lon,
        name: selectedBase.name,
        choice: selectedBase.id,
        areaId: selectedBase.id,
      },
      selectedAttractionIds: selectedPoolIds,
      selectedCyclingRoutes: payload.selectedCyclingRoutes,
      cluster: draftCluster,
      planComplete: true,
      poolEnriched: true,
    });
  }

  useEffect(() => {
    if (
      isCyclingMode &&
      effectivePlaceCards.length === 0 &&
      step === "discover"
    ) {
      setStep("base");
    }
  }, [isCyclingMode, effectivePlaceCards.length, step]);

  if (
    !story ||
    (effectivePlaceCards.length === 0 &&
      !(isCyclingMode && cyclingMapRoutes.length > 0))
  ) {
    return (
      <Card>
        <CardBody className="text-sm text-text-secondary">
          {pl
            ? "Brak opisów miejsc dla tej destynacji — wróć do wyszukiwarki lub wybierz region z katalogu."
            : "No place descriptions for this destination — go back to search or pick a catalogued region."}
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 text-sm">
        {(["discover", "base", "plan"] as WizardStep[]).map((s, i) => {
          const labels = pl
            ? ["1. Co zobaczyć", "2. Baza noclegowa", "3. Trasy i plan"]
            : ["1. What to see", "2. Lodging base", "3. Routes & plan"];
          const active = step === s;
          const done =
            (s === "discover" && step !== "discover") ||
            (s === "base" && step === "plan");
          return (
            <span
              key={s}
              className={cn(
                "rounded-full px-3 py-1 font-medium",
                active
                  ? "bg-brand-700 text-white"
                  : done
                    ? "bg-brand-50 text-brand-700"
                    : "bg-bg-soft text-text-tertiary",
              )}
            >
              {labels[i]}
            </span>
          );
        })}
      </nav>

      {cyclingAdvice && (
        <CyclingTripAdviceBanner advice={cyclingAdvice} pl={pl} />
      )}

      {step === "discover" && (
        <WhatToSeeStep
          story={story}
          placeCards={effectivePlaceCards}
          selectedIds={selectedIds}
          tripDays={tripDays}
          onToggle={togglePlace}
          onContinue={() => setStep("base")}
          onSelectRecommended={selectRecommended}
          locale={locale}
          onBackToActivities={onBackToActivities}
          onBackToRegions={onBackToRegions}
          onBackToResults={onBackToResults}
        />
      )}

      {step === "base" && (
        <>
          {primaryRegionOverview && (
            <Card className="border-brand-100 bg-brand-50/30">
              <CardHeader title={primaryRegionOverview.name} />
              <CardBody className="space-y-2 text-sm text-text-secondary">
                {primaryRegionOverview.areaLabel && (
                  <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
                    {primaryRegionOverview.areaLabel}
                  </p>
                )}
                <p className="leading-relaxed text-text-primary">
                  {primaryRegionOverview.overview}
                </p>
              </CardBody>
            </Card>
          )}

          <LodgingBaseMap
            options={baseOptions}
            selectedId={baseChoice}
            onSelect={setBaseChoice}
            attractions={mapAttractions}
            airports={payload.airports ?? []}
            cyclingRoutes={cyclingMapRoutes}
          />

          <Card>
            <CardHeader
              title={pl ? "Gdzie szukać noclegu?" : "Where to look for a stay?"}
            />
            <CardBody className="space-y-4">
              <p className="text-sm leading-relaxed text-text-secondary">
                {isCyclingMode
                  ? pl
                    ? "Baza noclegowa w rejonie tras rowerowych — najlepiej blisko morza i startów tras. Ty wybierasz ostatecznie; poniżej odległości do plaż, tras i lotniska."
                    : "Lodging in your cycling regions — ideally near the sea and route starts. You choose; distances to beaches, routes and airport below."
                  : pl
                    ? "Twój wybrany rejon podzielony na miejsca noclegowe — kliknij na mapie lub poniżej. Potem wyszukaj hotel na Booking w tej okolicy."
                    : "Your region split into lodging areas — click on the map or below. Then search Booking in that area."}
              </p>

              {baseOptions.map((option, index) => (
                <LodgingAreaCard
                  key={option.id}
                  option={option}
                  index={index}
                  selected={baseChoice === option.id}
                  pl={pl}
                  cyclingHint={
                    lodgingScores.get(option.id)
                      ? pl
                        ? lodgingScores.get(option.id)!.reasonPl
                        : lodgingScores.get(option.id)!.reasonEn
                      : null
                  }
                  distances={
                    baseChoice === option.id ? lodgingDistances : null
                  }
                  onSelect={() => setBaseChoice(option.id)}
                />
              ))}

              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="ghost" onClick={() => setStep("discover")}>
                  {pl ? "← Zmień miejsca" : "← Change places"}
                </Button>
                <Button disabled={!baseChoice} onClick={() => setStep("plan")}>
                  {pl ? "Dalej — zobacz trasy" : "Next — see routes"}
                </Button>
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {step === "plan" && (
        <>
          <Card className="overflow-hidden">
            <CardHeader
              title={pl ? "Twój plan — trasy z bazy" : "Your plan — routes from base"}
            />
            <RegionMap
              points={mapData.points}
              segments={mapData.segments}
              height={480}
              showRouteList
              cyclingRoutes={cyclingMapRoutes}
            />
          </Card>

          {cyclingMapRoutes.length > 0 && (
            <SelectedCyclingRoutesSummary routes={cyclingMapRoutes} pl={pl} />
          )}

          <SelectedPlacesSummary
            cards={effectivePlaceCards.filter((c) => selectedIds.has(c.id))}
            pl={pl}
            compact
          />

          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={() => setStep("base")}>
              {pl ? "← Zmień bazę" : "← Change base"}
            </Button>
            <Button
              size="lg"
              disabled={
                !selectedBase ||
                (selectedPoolIds.length === 0 && cyclingMapRoutes.length === 0)
              }
              onClick={confirmPlan}
            >
              {pl ? "Przygotuj hotele i ofertę →" : "Prepare hotels & offers →"}
            </Button>
            {onCancel && (
              <Button variant="ghost" onClick={onCancel}>
                {pl ? "Anuluj" : "Cancel"}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CyclingTripAdviceBanner({
  advice,
  pl,
}: {
  advice: CyclingTripAdvice;
  pl: boolean;
}) {
  const isWarning = advice.level === "warning";
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        isWarning
          ? "border-amber-300 bg-amber-50/90 text-amber-950"
          : "border-cyan-200 bg-cyan-50/60 text-text-primary",
      )}
    >
      <p className="font-semibold">
        {pl ? advice.titlePl : advice.titleEn}
      </p>
      <p className="mt-1 leading-relaxed text-text-secondary">
        {pl ? advice.bodyPl : advice.bodyEn}
      </p>
    </div>
  );
}

function LodgingAreaCard({
  option,
  index,
  selected,
  pl,
  cyclingHint,
  distances,
  onSelect,
}: {
  option: LodgingAreaOption;
  index: number;
  selected: boolean;
  pl: boolean;
  cyclingHint?: string | null;
  distances: ReturnType<typeof lodgingDistancesFromArea> | null;
  onSelect: () => void;
}) {
  const colors = ["bg-brand-700", "bg-cyan-600", "bg-violet-600", "bg-emerald-600"];
  const description = pl ? option.description_pl : option.description_en;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition-colors",
        selected
          ? "border-brand-700 bg-brand-50 ring-2 ring-brand-200"
          : "border-border-default hover:border-brand-300",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white",
            colors[index % colors.length],
          )}
        >
          {index + 1}
        </span>
        <p className="font-semibold text-text-primary">{option.name}</p>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
      {cyclingHint && (
        <p className="mt-1.5 text-xs font-medium text-emerald-800">
          {pl ? "Dla roweru: " : "For cycling: "}
          {cyclingHint}
        </p>
      )}

      {selected && distances && (
        <div className="mt-4 space-y-3 border-t border-brand-100 pt-3">
          {distances.airports.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                {pl ? "Od lotniska" : "From airport"}
              </p>
              <ul className="mt-1 space-y-1">
                {distances.airports.map((row) => (
                  <li key={row.id} className="text-sm text-text-primary">
                    <span className="font-medium">{row.label}</span>
                    <span className="text-text-secondary">
                      {" "}
                      — {row.km.toFixed(1)} km
                      {pl
                        ? ` (~${row.driveMinutes} min jazdy)`
                        : ` (~${row.driveMinutes} min drive)`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {distances.attractions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                {pl ? "Do wybranych miejsc" : "To your selected places"}
              </p>
              <ul className="mt-1 max-h-48 space-y-1 overflow-y-auto">
                {distances.attractions.map((row) => (
                  <li key={row.id} className="text-sm text-text-primary">
                    <span className="font-medium">{row.label}</span>
                    <span className="text-text-secondary">
                      {" "}
                      — {row.km.toFixed(1)} km
                      {pl
                        ? ` (~${row.driveMinutes} min)`
                        : ` (~${row.driveMinutes} min)`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="rounded-lg bg-white/80 px-3 py-2 text-xs text-brand-800">
            {pl
              ? `Szukaj noclegu na Booking: „${option.name}”`
              : `Search Booking for: “${option.name}”`}
          </p>
        </div>
      )}
    </button>
  );
}

function SelectedCyclingRoutesSummary({
  routes,
  pl,
}: {
  routes: ReturnType<typeof cyclingRoutesToMapOverlays>;
  pl: boolean;
}) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
        {pl ? "Wybrane trasy rowerowe" : "Selected cycling routes"} ({routes.length})
      </p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {routes.map((route) => (
          <li
            key={route.id}
            className="rounded-lg border border-emerald-100 bg-white/80 px-2.5 py-2 text-sm"
          >
            <span className="font-medium text-text-primary">{route.name}</span>
            <span className="mt-0.5 block text-xs text-text-secondary">
              {route.distanceKm.toFixed(1)} km
              {route.elevationGainM != null && ` · ${route.elevationGainM} m+`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SelectedPlacesSummary({
  cards,
  pl,
  compact,
}: {
  cards: PlaceCard[];
  pl: boolean;
  compact?: boolean;
}) {
  if (cards.length === 0) return null;
  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
        {pl ? "Twoje wybrane miejsca" : "Your selected places"}
      </p>
      <ul className={cn("mt-2 space-y-2", compact && "space-y-1")}>
        {cards.map((c) => (
          <li key={c.id} className="text-sm">
            <span className="font-medium text-text-primary">{c.name}</span>
            {!compact && (
              <span className="mt-0.5 block space-y-0.5 text-xs leading-relaxed text-text-secondary">
                <span className="block">{c.why}</span>
                {c.detail && <span className="block text-text-tertiary">{c.detail}</span>}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

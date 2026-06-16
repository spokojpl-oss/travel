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
  buildDiscoverPlaces,
  type PlaceCard,
} from "@/lib/plan/build-discover-places";
import { SEED_TOURIST_REGIONS } from "@/lib/destinations/tourist-regions-seed";
import {
  computeLodgingBaseOptions,
  type LodgingBaseChoice,
} from "@/lib/plan/lodging-base-options";
import {
  defaultExplorationScope,
  explorationScopeFromString,
  type ExplorationScope,
} from "@/lib/search/exploration-scope";
import type { DestinationBuildPayload } from "@/lib/search/destination-build-payload";
import { useLocale } from "@/i18n/locale-provider";
import type { GeoCluster } from "@/types/domain";

type WizardStep = "discover" | "base" | "plan";

export function DestinationPlanWizard({
  payload,
  withKids,
  onComplete,
  onCancel,
}: {
  payload: DestinationBuildPayload;
  withKids?: boolean;
  locale?: "pl" | "en";
  onComplete: (updated: DestinationBuildPayload) => void;
  onCancel?: () => void;
}) {
  const { locale } = useLocale();
  const pl = locale !== "en";

  const rawPool = payload.attractionPool;

  const discover = useMemo(() => {
    if (payload.discover) return payload.discover;
    return buildDiscoverPlaces({
      pool: rawPool,
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
      referencePoint: payload.cluster.center,
      withKids,
      stayRadiusKm: payload.stayRadiusKm,
    });
  }, [payload, rawPool, locale, withKids]);

  const placeCards = discover.placeCards;
  const story = discover.story;

  const explorationScope: ExplorationScope =
    explorationScopeFromString(payload.explorationScope ?? null) ??
    defaultExplorationScope();
  const tripDays = payload.tripDays ?? 5;

  const [step, setStep] = useState<WizardStep>("discover");
  const [baseChoice, setBaseChoice] = useState<LodgingBaseChoice | null>(
    payload.lodgingBase?.choice ?? null,
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
    const ids = payload.discover?.suggestedIds;
    if (!ids?.length) return;
    setSelectedIds(new Set(ids));
  }, [payload.poolEnriched, payload.discover?.suggestedIds, payload.selectedAttractionIds]);

  const selectedPoolIds = useMemo(
    () => resolvePlaceSelectionToPoolIds([...selectedIds], rawPool, placeCards),
    [selectedIds, rawPool, placeCards],
  );

  const selectedAttractions = useMemo(
    () => rawPool.filter((a) => selectedPoolIds.includes(a.id)),
    [rawPool, selectedPoolIds],
  );

  const baseOptions = useMemo(
    () =>
      computeLodgingBaseOptions(selectedAttractions.length > 0 ? selectedAttractions : rawPool, {
        withKids,
        locale,
        cluster: payload.cluster,
      }),
    [selectedAttractions, rawPool, withKids, locale, payload.cluster],
  );

  const selectedBase = baseOptions.find((o) => o.choice === baseChoice);

  const poolWithMeta = useMemo(() => {
    if (!selectedBase) return rawPool;
    return applyPlanMetaToPool(
      rawPool,
      { lat: selectedBase.lat, lon: selectedBase.lon },
      explorationScope,
      tripDays,
    );
  }, [rawPool, selectedBase, explorationScope, tripDays]);

  const draftCluster: GeoCluster = useMemo(() => {
    const base = selectedBase;
    const selectedFromPool = poolWithMeta.filter((a) =>
      selectedPoolIds.includes(a.id),
    );
    return {
      ...payload.cluster,
      center: base
        ? { lat: base.lat, lon: base.lon }
        : payload.cluster.center,
      settlement: base
        ? { name: base.label, lat: base.lat, lon: base.lon }
        : payload.cluster.settlement,
      attractions: selectedFromPool,
    };
  }, [payload.cluster, poolWithMeta, selectedBase, selectedPoolIds]);

  const mapData = useMemo(
    () =>
      buildClusterMapData(draftCluster, [], {
        locale,
        attractionPool: poolWithMeta,
      }),
    [draftCluster, locale, poolWithMeta],
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
    const ids = placeCards.filter((c) => c.recommended).map((c) => c.id);
    if (discover.suggestedIds?.length) {
      setSelectedIds(new Set(discover.suggestedIds));
    } else {
      setSelectedIds(new Set(ids));
    }
  }

  function confirmPlan() {
    if (!selectedBase || selectedPoolIds.length === 0) return;
    onComplete({
      ...payload,
      lodgingBase: {
        lat: selectedBase.lat,
        lon: selectedBase.lon,
        name: selectedBase.label,
        choice: selectedBase.choice,
      },
      selectedAttractionIds: selectedPoolIds,
      cluster: draftCluster,
      planComplete: true,
      poolEnriched: true,
    });
  }

  if (!story || placeCards.length === 0) {
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

      {step === "discover" && (
        <WhatToSeeStep
          story={story}
          placeCards={placeCards}
          selectedIds={selectedIds}
          tripDays={tripDays}
          onToggle={togglePlace}
          onContinue={() => setStep("base")}
          onSelectRecommended={selectRecommended}
          locale={locale}
        />
      )}

      {step === "base" && (
        <Card>
          <CardHeader
            title={pl ? "Gdzie się zatrzymać?" : "Where to stay?"}
          />
          <CardBody className="space-y-4">
            <p className="text-sm leading-relaxed text-text-secondary">
              {pl
                ? "Centrum miasta czy nabrzeże — wybierz bazę noclegową. To wpływa na sposób szukania hoteli (np. na Booking)."
                : "City centre or waterfront — pick your lodging base. This affects how we search for hotels (e.g. on Booking)."}
            </p>

            {baseOptions.map((option) => (
              <button
                key={option.choice}
                type="button"
                onClick={() => setBaseChoice(option.choice)}
                className={cn(
                  "w-full rounded-xl border p-4 text-left transition-colors",
                  baseChoice === option.choice
                    ? "border-brand-700 bg-brand-50 ring-2 ring-brand-200"
                    : "border-border-default hover:border-brand-300",
                )}
              >
                <p className="font-semibold text-text-primary">{option.label}</p>
                <p className="mt-1 text-sm text-text-secondary">
                  {pl ? option.hint_pl : option.hint_en}
                </p>
              </button>
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
            />
          </Card>

          <SelectedPlacesSummary
            cards={placeCards.filter((c) => selectedIds.has(c.id))}
            pl={pl}
            compact
          />

          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={() => setStep("base")}>
              {pl ? "← Zmień bazę" : "← Change base"}
            </Button>
            <Button
              size="lg"
              disabled={!selectedBase || selectedPoolIds.length === 0}
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
              <span className="mt-0.5 block text-xs leading-relaxed text-text-secondary">
                {c.why}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

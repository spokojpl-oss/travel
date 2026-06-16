"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RegionMap } from "@/components/features/RegionMap";
import { cn } from "@/lib/utils/cn";
import { buildClusterMapData } from "@/lib/maps/build-cluster-map";
import { toPolishAttractionName } from "@/lib/plan/attraction-display-name";
import {
  applyPlanMetaToPool,
  computePlanSuggestions,
} from "@/lib/plan/build-plan-pool";
import {
  computeLodgingBaseOptions,
  type LodgingBaseChoice,
} from "@/lib/plan/lodging-base-options";
import {
  isDayTripAttraction,
  readPlanMeta,
} from "@/lib/plan/plan-attraction-meta";
import {
  defaultExplorationScope,
  explorationScopeFromString,
  type ExplorationScope,
} from "@/lib/search/exploration-scope";
import type {
  DestinationBuildPayload,
  PlanRegionContext,
} from "@/lib/search/destination-build-payload";
import { useLocale } from "@/i18n/locale-provider";
import type { GeoCluster } from "@/types/domain";

type WizardStep = "base" | "pick" | "summary";

function attractionBadge(
  id: string,
  pool: DestinationBuildPayload["attractionPool"],
  pl: boolean,
): string | undefined {
  const a = pool.find((x) => x.id === id);
  if (!a) return undefined;
  const meta = readPlanMeta(a);
  if (meta?.kind === "day_trip" && meta.drive_minutes) {
    return pl
      ? `Wycieczka ~${meta.drive_minutes} min`
      : `Day trip ~${meta.drive_minutes} min`;
  }
  if (meta?.group_size && meta.group_size > 1) {
    return pl
      ? `${meta.group_size} plaż w okolicy`
      : `${meta.group_size} beaches grouped`;
  }
  return undefined;
}

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
  const explorationScope: ExplorationScope =
    explorationScopeFromString(payload.explorationScope ?? null) ??
    defaultExplorationScope();
  const tripDays = payload.tripDays ?? 5;

  const [step, setStep] = useState<WizardStep>("base");
  const [baseChoice, setBaseChoice] = useState<LodgingBaseChoice | null>(
    payload.lodgingBase?.choice ?? null,
  );

  const baseOptions = useMemo(
    () =>
      computeLodgingBaseOptions(rawPool, {
        withKids,
        locale,
        cluster: payload.cluster,
      }),
    [rawPool, withKids, locale, payload.cluster],
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

  const suggestionOptions = useMemo(
    () => ({
      explorationScope,
      tripDays,
      preferredActivities: payload.activities,
      withKids,
    }),
    [explorationScope, tripDays, payload.activities, withKids],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (payload.selectedAttractionIds?.length) {
      return new Set(payload.selectedAttractionIds);
    }
    return new Set<string>();
  });

  const userEditedSelection = useRef(
    Boolean(payload.selectedAttractionIds?.length),
  );

  function applyDefaultSelection(base: { lat: number; lon: number }) {
    const withMeta = applyPlanMetaToPool(
      rawPool,
      base,
      explorationScope,
      tripDays,
    );
    const ids = computePlanSuggestions(withMeta, base, suggestionOptions);
    setSelectedIds(new Set(ids));
  }

  const recomputeIfNeeded = useCallback(() => {
    if (!selectedBase || step === "base" || userEditedSelection.current) return;
    applyDefaultSelection({
      lat: selectedBase.lat,
      lon: selectedBase.lon,
    });
  }, [selectedBase, step, rawPool, explorationScope, tripDays, suggestionOptions]);

  useEffect(() => {
    recomputeIfNeeded();
  }, [recomputeIfNeeded]);

  function goToPickStep() {
    if (!selectedBase) return;
    userEditedSelection.current = false;
    applyDefaultSelection({
      lat: selectedBase.lat,
      lon: selectedBase.lon,
    });
    setStep("pick");
  }

  function toggleAttraction(id: string) {
    userEditedSelection.current = true;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const draftCluster: GeoCluster = useMemo(() => {
    const base = selectedBase;
    return {
      ...payload.cluster,
      center: base
        ? { lat: base.lat, lon: base.lon }
        : payload.cluster.center,
      settlement: base
        ? { name: base.label, lat: base.lat, lon: base.lon }
        : payload.cluster.settlement,
      attractions: poolWithMeta.filter((a) => selectedIds.has(a.id)),
    };
  }, [payload.cluster, poolWithMeta, selectedBase, selectedIds]);

  const mapData = useMemo(
    () =>
      buildClusterMapData(draftCluster, [], {
        selectedIds: step === "pick" ? undefined : selectedIds,
        locale,
        maxAttractions: step === "pick" ? 400 : undefined,
        attractionPool: poolWithMeta,
      }),
    [draftCluster, selectedIds, step, locale, poolWithMeta],
  );

  const pickMapData = useMemo(() => {
    const allPoints = buildClusterMapData(
      { ...draftCluster, attractions: poolWithMeta },
      [],
      { locale, maxAttractions: 400, attractionPool: poolWithMeta },
    );
    return allPoints;
  }, [draftCluster, poolWithMeta, locale]);

  const dayTrips = poolWithMeta.filter(isDayTripAttraction);
  const nearby = poolWithMeta.filter((a) => !isDayTripAttraction(a));

  function confirmPlan() {
    if (!selectedBase || selectedIds.size === 0) return;
    onComplete({
      ...payload,
      lodgingBase: {
        lat: selectedBase.lat,
        lon: selectedBase.lon,
        name: selectedBase.label,
        choice: selectedBase.choice,
      },
      selectedAttractionIds: [...selectedIds],
      cluster: draftCluster,
      planComplete: true,
      poolEnriched: true,
    });
  }

  const region = payload.region;

  return (
    <div className="space-y-6">
      {region && <RegionIntro region={region} locale={locale} />}

      {!region && (
        <Card className="border-brand-100 bg-brand-50/30">
          <CardBody>
            <p className="font-semibold text-text-primary">
              {payload.destinationLabel ??
                payload.cluster.settlement?.name ??
                "Wybrany rejon"}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              {pl
                ? "Najpierw wybierz bazę noclegową (centrum vs nabrzeże), potem miejsca — w tym wycieczki dojazdowe."
                : "Pick lodging base (centre vs waterfront), then places including day trips."}
            </p>
          </CardBody>
        </Card>
      )}

      <nav className="flex flex-wrap gap-2 text-sm">
        {(["base", "pick", "summary"] as WizardStep[]).map((s, i) => {
          const labels = pl
            ? ["1. Baza noclegowa", "2. Wybierz miejsca", "3. Podsumowanie"]
            : ["1. Lodging base", "2. Pick places", "3. Summary"];
          const active = step === s;
          const done =
            (s === "base" && baseChoice != null && step !== "base") ||
            (s === "pick" && step === "summary");
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

      {step === "base" && (
        <Card>
          <CardHeader
            title={pl ? "Gdzie się zatrzymać?" : "Where to stay?"}
          />
          <CardBody className="space-y-3">
            <p className="text-sm text-text-secondary">
              {pl
                ? "Punkty na mapie to centrum miejscowości lub nabrzeże — tak szukasz na Booking (np. „Vlorë centrum” vs „przy plaży”)."
                : "Map pins are town centre or waterfront — how you'd search on Booking."}
            </p>
            {baseOptions.map((option) => (
              <button
                key={option.choice}
                type="button"
                onClick={() => {
                  setBaseChoice(option.choice);
                  userEditedSelection.current = false;
                }}
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
            <Button
              className="mt-2"
              disabled={!baseChoice}
              onClick={goToPickStep}
            >
              {pl ? "Dalej — wybierz miejsca na mapie" : "Next — pick on map"}
            </Button>
          </CardBody>
        </Card>
      )}

      {step === "pick" && (
        <>
          <Card className="overflow-hidden">
            <CardHeader title={pl ? "Kliknij, co chcesz zobaczyć" : "Click what you want to see"} />
            <RegionMap
              points={pickMapData.points}
              segments={[]}
              height={480}
              showRouteList={false}
              highlightedPointId={null}
              onPointClick={(point) => {
                if (point.type === "attraction") toggleAttraction(point.id);
              }}
            />
            <CardBody className="text-sm text-text-secondary">
              {pl
                ? `Wybrane: ${selectedIds.size} z ${poolWithMeta.length} (w tym ${dayTrips.length} propozycji wycieczek dojazdowych).`
                : `Selected: ${selectedIds.size} of ${poolWithMeta.length}.`}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-4">
              {dayTrips.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
                    {pl ? "Wycieczki dojazdowe" : "Day trips"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {dayTrips.map((a) => (
                      <AttractionChip
                        key={a.id}
                        id={a.id}
                        name={toPolishAttractionName(a.name, locale)}
                        selected={selectedIds.has(a.id)}
                        badge={attractionBadge(a.id, poolWithMeta, pl)}
                        onToggle={() => toggleAttraction(a.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  {pl ? "W okolicy bazy" : "Near your base"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {nearby.map((a) => (
                    <AttractionChip
                      key={a.id}
                      id={a.id}
                      name={toPolishAttractionName(a.name, locale)}
                      selected={selectedIds.has(a.id)}
                      badge={attractionBadge(a.id, poolWithMeta, pl)}
                      onToggle={() => toggleAttraction(a.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    userEditedSelection.current = false;
                    setStep("base");
                  }}
                >
                  {pl ? "← Zmień bazę" : "← Change base"}
                </Button>
                <Button
                  disabled={selectedIds.size === 0}
                  onClick={() => setStep("summary")}
                >
                  {pl ? "Dalej — zobacz trasy" : "Next — see routes"}
                </Button>
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {step === "summary" && (
        <>
          <Card className="overflow-hidden">
            <CardHeader title={pl ? "Twoje trasy z bazy" : "Routes from your base"} />
            <RegionMap
              points={mapData.points}
              segments={mapData.segments}
              height={480}
              showRouteList
            />
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={() => setStep("pick")}>
              {pl ? "← Zmień miejsca" : "← Change places"}
            </Button>
            <Button
              size="lg"
              disabled={!selectedBase || selectedIds.size === 0}
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

function AttractionChip({
  id,
  name,
  selected,
  badge,
  onToggle,
}: {
  id: string;
  name: string;
  selected: boolean;
  badge?: string;
  onToggle: () => void;
}) {
  return (
    <button
      key={id}
      type="button"
      onClick={onToggle}
      className={cn(
        "rounded-xl border px-3 py-2 text-left text-sm",
        selected
          ? "border-brand-700 bg-brand-50 text-text-primary"
          : "border-border-default bg-bg-soft text-text-tertiary line-through",
      )}
    >
      <span className="font-medium">{name}</span>
      {badge && (
        <span className="mt-0.5 block text-xs text-brand-700">{badge}</span>
      )}
    </button>
  );
}

function RegionIntro({
  region,
  locale,
}: {
  region: PlanRegionContext;
  locale: "pl" | "en";
}) {
  const name = locale === "en" ? region.name_en : region.name_pl;
  const overview = locale === "en" ? region.overview_en : region.overview_pl;
  const stayHint = locale === "en" ? region.stay_hint_en : region.stay_hint_pl;

  return (
    <Card className="border-brand-100">
      <CardBody className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
          {locale === "en" ? "Your region" : "Twój rejon"}
        </p>
        <h2 className="font-display text-xl font-bold text-text-primary">{name}</h2>
        <p className="text-sm leading-relaxed text-text-primary">{overview}</p>
        <p className="rounded-lg border border-brand-100 bg-brand-50/50 px-3 py-2 text-sm text-text-secondary">
          {stayHint}
        </p>
      </CardBody>
    </Card>
  );
}

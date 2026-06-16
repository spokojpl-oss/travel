"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RegionMap } from "@/components/features/RegionMap";
import { cn } from "@/lib/utils/cn";
import { buildClusterMapData } from "@/lib/maps/build-cluster-map";
import { toPolishAttractionName } from "@/lib/plan/attraction-display-name";
import {
  computeLodgingBaseOptions,
  type LodgingBaseChoice,
} from "@/lib/plan/lodging-base-options";
import type {
  DestinationBuildPayload,
  PlanRegionContext,
} from "@/lib/search/destination-build-payload";
import { useLocale } from "@/i18n/locale-provider";
import type { GeoCluster } from "@/types/domain";

type WizardStep = "base" | "pick" | "summary";

export function DestinationPlanWizard({
  payload,
  withKids,
  onComplete,
  onCancel,
}: {
  payload: DestinationBuildPayload;
  withKids?: boolean;
  onComplete: (updated: DestinationBuildPayload) => void;
  onCancel?: () => void;
}) {
  const { locale } = useLocale();
  const pl = locale !== "en";

  const [step, setStep] = useState<WizardStep>("base");
  const [baseChoice, setBaseChoice] = useState<LodgingBaseChoice | null>(
    payload.lodgingBase?.choice ?? null,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () =>
      new Set(
        payload.selectedAttractionIds ??
          payload.attractionPool.slice(0, 6).map((a) => a.id),
      ),
  );

  const pool = payload.attractionPool;
  const baseOptions = useMemo(
    () => computeLodgingBaseOptions(pool, { withKids, locale }),
    [pool, withKids, locale],
  );

  const selectedBase = baseOptions.find((o) => o.choice === baseChoice);

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
      attractions: pool.filter((a) => selectedIds.has(a.id)),
    };
  }, [payload.cluster, pool, selectedBase, selectedIds]);

  const mapData = useMemo(
    () =>
      buildClusterMapData(draftCluster, [], {
        selectedIds: step === "pick" ? undefined : selectedIds,
        locale,
        maxAttractions: step === "pick" ? 400 : undefined,
      }),
    [draftCluster, selectedIds, step, locale],
  );

  const pickMapData = useMemo(() => {
    const allPoints = buildClusterMapData(
      { ...draftCluster, attractions: pool },
      [],
      { locale, maxAttractions: 400 },
    );
    return allPoints;
  }, [draftCluster, pool, locale]);

  function toggleAttraction(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
              {payload.destinationLabel ?? payload.cluster.settlement?.name ?? "Wybrany rejon"}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              {pl
                ? "Najpierw wybierz bazę noclegową, potem miejsca na mapie — dopiero wtedy liczymy trasy."
                : "Pick your lodging base, then places on the map — routes are calculated after that."}
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
                ? withKids
                  ? "Z dziećmi często lepiej spać z dala od hałasu — ale blisko plaży też ma sens, jeśli wolicie wychodzić pieszo."
                  : "Centrum = bliżej życia nocnego i restauracji. Spokojniej = mniej tłumów, dojazdy autem."
                : "Pick what fits your trip — center vs quieter area."}
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
            <Button
              className="mt-2"
              disabled={!baseChoice}
              onClick={() => setStep("pick")}
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
                ? `Wybrane: ${selectedIds.size} z ${pool.length}. Zielone punkty to wszystkie miejsca w rejonie.`
                : `Selected: ${selectedIds.size} of ${pool.length}.`}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {pool.map((a) => {
                  const on = selectedIds.has(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAttraction(a.id)}
                      className={cn(
                        "rounded-full px-3 py-1 text-sm",
                        on
                          ? "bg-brand-700 text-white"
                          : "bg-bg-soft text-text-tertiary line-through",
                      )}
                    >
                      {toPolishAttractionName(a.name, locale)}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="ghost" onClick={() => setStep("base")}>
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

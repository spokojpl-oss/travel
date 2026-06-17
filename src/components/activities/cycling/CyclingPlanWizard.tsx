"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LodgingBaseMap } from "@/components/features/LodgingBaseMap";
import { CyclingActivityProvider } from "@/components/activities/cycling/CyclingActivityContext";
import { CyclingRoutesList } from "@/components/activities/cycling/CyclingRoutesList";
import { injectCuratedPicksForRegions } from "@/lib/plan/curated-day-trips";
import { matchingRegionsForDestination } from "@/lib/plan/destination-story";
import { SEED_TOURIST_REGIONS } from "@/lib/destinations/tourist-regions-seed";
import {
  computeLodgingAreaOptions,
  lodgingDistancesFromArea,
  type LodgingAreaOption,
} from "@/lib/plan/lodging-sub-areas";
import { applyPlanMetaToPool } from "@/lib/plan/build-plan-pool";
import {
  defaultExplorationScope,
  explorationScopeFromString,
} from "@/lib/search/exploration-scope";
import { cn } from "@/lib/utils/cn";
import type { DestinationBuildPayload } from "@/lib/search/destination-build-payload";
import { useLocale } from "@/i18n/locale-provider";
import type { GeoCluster } from "@/types/domain";

type WizardStep = "routes" | "base";

export function CyclingPlanWizard({
  payload,
  destinationId,
  destinationCenter,
  onComplete,
  onBackToRegions,
  onBackToResults,
}: {
  payload: DestinationBuildPayload;
  destinationId: string | null;
  destinationCenter: { lat: number; lng: number };
  onComplete: (updated: DestinationBuildPayload) => void;
  onBackToRegions?: () => void;
  onBackToResults?: () => void;
}) {
  const { locale } = useLocale();
  const pl = locale !== "en";
  const [step, setStep] = useState<WizardStep>("routes");
  const [batchDone, setBatchDone] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [baseChoice, setBaseChoice] = useState<string | null>(
    payload.lodgingBase?.areaId ?? payload.lodgingBase?.choice ?? null,
  );

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
    if (matchedRegions.length === 0) return payload.attractionPool;
    return injectCuratedPicksForRegions({
      catalog: SEED_TOURIST_REGIONS,
      regionIds: matchedRegions.map((r) => r.id),
      existingPool: payload.attractionPool,
      locale,
    });
  }, [payload.attractionPool, matchedRegions, locale]);

  const beachAndBikeIds = useMemo(
    () =>
      enrichedPool
        .filter((a) =>
          a.activity_tags?.some((t) =>
            [
              "sandy_beaches",
              "bike_rental",
              "ebike_rental",
              "cycling",
              "mountain_biking",
            ].includes(t.activity_slug),
          ),
        )
        .map((a) => a.id),
    [enrichedPool],
  );

  const baseOptions = useMemo(() => {
    const fromRegions = computeLodgingAreaOptions(matchedRegions, {
      attractions: enrichedPool,
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
    matchedRegions,
    enrichedPool,
    locale,
    payload.stayRadiusKm,
    payload.region,
    payload.cluster.center,
    pl,
  ]);

  const selectedBase = baseOptions.find((o) => o.id === baseChoice) ?? null;

  const lodgingDistances = useMemo(() => {
    if (!selectedBase) return null;
    return lodgingDistancesFromArea(
      selectedBase,
      enrichedPool,
      payload.airports ?? [],
    );
  }, [selectedBase, enrichedPool, payload.airports]);

  const mapAttractions = useMemo(
    () =>
      enrichedPool.map((a) => ({
        id: a.id,
        name: a.name,
        lat: Number(a.lat),
        lon: Number(a.lon),
      })),
    [enrichedPool],
  );

  useEffect(() => {
    if (!destinationId || batchDone || batchLoading) return;

    let cancelled = false;
    setBatchLoading(true);
    setBatchError(null);

    void fetch("/api/activities/cycling/generate-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destinationId,
        startLat: destinationCenter.lat,
        startLng: destinationCenter.lng,
      }),
    })
      .then(async (res) => {
        const data = (await res.json()) as {
          generated?: number;
          errors?: string[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string" ? data.error : "Batch failed",
          );
        }
        if (!cancelled) {
          setBatchDone(true);
          if ((data.generated ?? 0) === 0 && data.errors?.length) {
            setBatchError(data.errors.join("; "));
          }
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setBatchError(e instanceof Error ? e.message : "Błąd generowania tras");
        }
      })
      .finally(() => {
        if (!cancelled) setBatchLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [destinationId, destinationCenter, batchDone, batchLoading]);

  function confirmPlan() {
    if (!selectedBase) return;

    const scope =
      explorationScopeFromString(payload.explorationScope ?? null) ??
      defaultExplorationScope();

    const poolWithMeta = applyPlanMetaToPool(
      enrichedPool,
      { lat: selectedBase.lat, lon: selectedBase.lon },
      scope,
      payload.tripDays ?? 5,
    );

    const selectedFromPool =
      beachAndBikeIds.length > 0
        ? poolWithMeta.filter((a) => beachAndBikeIds.includes(a.id))
        : poolWithMeta;

    const draftCluster: GeoCluster = {
      ...payload.cluster,
      center: { lat: selectedBase.lat, lon: selectedBase.lon },
      settlement: {
        name: selectedBase.name,
        lat: selectedBase.lat,
        lon: selectedBase.lon,
      },
      attractions: selectedFromPool,
    };

    onComplete({
      ...payload,
      attractionPool: poolWithMeta,
      lodgingBase: {
        lat: selectedBase.lat,
        lon: selectedBase.lon,
        name: selectedBase.name,
        choice: selectedBase.id,
        areaId: selectedBase.id,
      },
      selectedAttractionIds:
        beachAndBikeIds.length > 0 ? beachAndBikeIds : undefined,
      cluster: draftCluster,
      planComplete: true,
      poolEnriched: true,
    });
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 text-sm">
        {(["routes", "base"] as WizardStep[]).map((s, i) => {
          const labels = pl
            ? ["1. Trasy rowerowe", "2. Baza noclegowa"]
            : ["1. Cycling routes", "2. Lodging base"];
          const active = step === s;
          const done = s === "routes" && step === "base";
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

      {step === "routes" && (
        <div className="space-y-4">
          {!destinationId && (
            <Card>
              <CardBody className="text-sm text-text-secondary">
                {pl
                  ? "Tworzymy destynację w tle — za chwilę wygenerujemy pakiet tras…"
                  : "Creating destination — route pack will generate shortly…"}
              </CardBody>
            </Card>
          )}

          {batchLoading && (
            <Card>
              <CardBody className="text-sm text-text-secondary">
                {pl
                  ? "Generujemy pakiet tras (szosa, gravel, MTB) równolegle — to chwilę potrwa…"
                  : "Generating route pack (road, gravel, MTB) in parallel…"}
              </CardBody>
            </Card>
          )}

          {batchError && (
            <Card className="border-warning/40 bg-orange-50/60">
              <CardBody className="text-sm text-text-secondary">{batchError}</CardBody>
            </Card>
          )}

          {destinationId && (
            <CyclingActivityProvider
              destinationId={destinationId}
              destinationCenter={destinationCenter}
            >
              <CyclingRoutesList destinationId={destinationId} />
            </CyclingActivityProvider>
          )}

          <div className="flex flex-wrap gap-3">
            {onBackToRegions && (
              <Button variant="ghost" onClick={onBackToRegions}>
                {pl ? "← Zmień region" : "← Change region"}
              </Button>
            )}
            {onBackToResults && (
              <Button variant="ghost" onClick={onBackToResults}>
                {pl ? "← Inne rejony" : "← Other areas"}
              </Button>
            )}
            <Button
              disabled={!destinationId || batchLoading}
              onClick={() => setStep("base")}
            >
              {pl ? "Dalej — wybierz nocleg →" : "Next — choose lodging →"}
            </Button>
          </div>
        </div>
      )}

      {step === "base" && (
        <>
          <Card className="border-brand-100 bg-brand-50/30">
            <CardHeader
              title={pl ? "Gdzie spać z rowerem?" : "Where to stay with your bike?"}
            />
            <CardBody className="text-sm text-text-secondary">
              {pl
                ? "W mieście — bliżej wypożyczalni i serwisu. Przy plaży — regeneracja między przejazdami. Sprawdź, czy hotel ma przechowalnię rowerów."
                : "Town — closer to rentals and bike shops. Beach — recovery between rides. Check bike storage at the hotel."}
            </CardBody>
          </Card>

          <LodgingBaseMap
            options={baseOptions}
            selectedId={baseChoice}
            onSelect={setBaseChoice}
            attractions={mapAttractions}
            airports={payload.airports ?? []}
          />

          <Card>
            <CardHeader
              title={pl ? "Baza noclegowa" : "Lodging base"}
            />
            <CardBody className="space-y-4">
              {baseOptions.map((option, index) => (
                <LodgingAreaCard
                  key={option.id}
                  option={option}
                  index={index}
                  selected={baseChoice === option.id}
                  pl={pl}
                  distances={
                    baseChoice === option.id ? lodgingDistances : null
                  }
                  onSelect={() => setBaseChoice(option.id)}
                />
              ))}

              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="ghost" onClick={() => setStep("routes")}>
                  {pl ? "← Zmień trasy" : "← Change routes"}
                </Button>
                <Button size="lg" disabled={!baseChoice} onClick={confirmPlan}>
                  {pl ? "Przygotuj ofertę (loty, hotele) →" : "Prepare offer (flights, hotels) →"}
                </Button>
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}

function LodgingAreaCard({
  option,
  index,
  selected,
  pl,
  distances,
  onSelect,
}: {
  option: LodgingAreaOption;
  index: number;
  selected: boolean;
  pl: boolean;
  distances: ReturnType<typeof lodgingDistancesFromArea> | null;
  onSelect: () => void;
}) {
  const desc = pl ? option.description_pl : option.description_en;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition-colors",
        selected
          ? "border-brand-700 bg-brand-50/50 ring-2 ring-brand-700"
          : "border-border-default hover:border-brand-300",
      )}
    >
      <p className="font-medium text-text-primary">
        {index + 1}. {option.name}
      </p>
      <p className="mt-1 text-sm text-text-secondary">{desc}</p>
      {distances && (
        <p className="mt-2 text-xs text-text-tertiary">
          {pl ? "Lotniska i punkty w okolicy na mapie" : "Airports and nearby points on map"}
        </p>
      )}
    </button>
  );
}

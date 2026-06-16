"use client";

import { useMemo } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DestinationClimateBudgetPanel } from "@/components/features/DestinationClimateBudgetPanel";
import { DestinationStoryHero } from "@/components/features/DestinationStoryHero";
import { SEED_TOURIST_REGIONS } from "@/lib/destinations/tourist-regions-seed";
import {
  matchingRegionsForDestination,
  resolveDestinationStory,
} from "@/lib/plan/destination-story";
import type { DestinationDiscovery } from "@/lib/search/destination-discover";
import { useLocale, useT } from "@/i18n/locale-provider";

export function DestinationOverviewPanel({
  destinationLabel,
  destinationLat,
  destinationLon,
  discovering,
  discovery,
  discoveryError = null,
  onRetry,
  waitingForCoords = false,
  tripDays,
  departureDate,
  returnDate,
  onDatesChange,
  onChooseActivities,
}: {
  destinationLabel: string;
  destinationLat?: number | null;
  destinationLon?: number | null;
  discovering: boolean;
  discovery: DestinationDiscovery | null;
  discoveryError?: string | null;
  onRetry?: () => void;
  waitingForCoords?: boolean;
  tripDays?: number;
  departureDate?: string;
  returnDate?: string | null;
  onDatesChange?: (departure: string, returnDate: string | null) => void;
  onChooseActivities: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();

  const story = useMemo(() => {
    const regions = matchingRegionsForDestination(
      SEED_TOURIST_REGIONS,
      destinationLabel,
    );
    return resolveDestinationStory({
      destinationLabel,
      regions,
      locale,
    });
  }, [destinationLabel, locale]);

  const loading = waitingForCoords || (discovering && !discovery);
  const refreshingWeather = discovering && discovery != null;

  if (loading) {
    return (
      <>
        <DestinationStoryHero
          story={story}
          tripDays={tripDays}
          loading
          subtitle={discovering || waitingForCoords ? t("search.overviewLoading") : undefined}
        />
        {discoveryError && !discovering && !waitingForCoords && (
          <div className="mb-8 rounded-2xl border border-danger/30 bg-orange-50/80 p-6 text-center">
            <p className="font-medium text-text-primary">{t("search.discoverError")}</p>
            <p className="mt-2 text-sm text-text-secondary">{discoveryError}</p>
            {onRetry && (
              <Button className="mt-4" onClick={onRetry}>
                {t("search.discoverRetry")}
              </Button>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="overview-content-enter">
      {discoveryError && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-text-secondary">
          {discoveryError}
        </div>
      )}

      <DestinationStoryHero story={story} tripDays={tripDays} />

      {(discovery?.weather || refreshingWeather) && (
        <Card className="mb-6 border-brand-100 bg-brand-50/40">
          <CardHeader title={t("search.overviewWeather")} />
          <CardBody className="text-sm text-text-secondary">
            {refreshingWeather && !discovery?.weather ? (
              <p>{t("search.overviewWeatherRefreshing")}</p>
            ) : discovery?.weather ? (
              <>
                <p className={refreshingWeather ? "opacity-60" : undefined}>
                  {discovery.weather.date_from} – {discovery.weather.date_to}:{" "}
                  <strong className="text-text-primary">
                    {discovery.weather.avg_temp_min}–
                    {discovery.weather.avg_temp_max}°C
                  </strong>
                  {discovery.weather.rainy_days > 0 &&
                    ` · ${discovery.weather.rainy_days} ${t("search.overviewRainyDays")}`}
                  {discovery.weather.avg_uv_index > 5 &&
                    ` · UV ~${discovery.weather.avg_uv_index}`}
                </p>
                {refreshingWeather && (
                  <p className="mt-2 text-xs text-brand-700">
                    {t("search.overviewWeatherRefreshing")}
                  </p>
                )}
                <p className="mt-1 text-xs text-text-tertiary">
                  {t("search.overviewWeatherHint")}
                </p>
              </>
            ) : null}
          </CardBody>
        </Card>
      )}

      <DestinationClimateBudgetPanel
        destinationLabel={destinationLabel}
        lat={destinationLat}
        lon={destinationLon}
        departureDate={departureDate}
        returnDate={returnDate}
        onDatesChange={onDatesChange}
      />

      {discovery &&
        !discovery.summary.includes("krótki przegląd przed wyborem") &&
        !discovery.summary.includes("quick snapshot before") && (
          <Card className="mb-6">
            <CardHeader title={t("search.overviewUnderstand")} />
            <CardBody className="text-sm text-text-secondary">
              <p className="text-base leading-relaxed text-text-primary">
                {discovery.summary}
              </p>
            </CardBody>
          </Card>
        )}

      <Button size="lg" onClick={onChooseActivities}>
        {t("search.continueToRhythm")}
      </Button>
    </div>
  );
}

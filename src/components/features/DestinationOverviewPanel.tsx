"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DestinationClimateBudgetPanel } from "@/components/features/DestinationClimateBudgetPanel";
import { DestinationOverviewHero } from "@/components/features/DestinationOverviewLoader";
import type { DestinationDiscovery } from "@/lib/search/destination-discover";
import { useT } from "@/i18n/locale-provider";

export function DestinationOverviewPanel({
  destinationLabel,
  destinationLat,
  destinationLon,
  discovering,
  discovery,
  discoveryError = null,
  onRetry,
  waitingForCoords = false,
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
  onChooseActivities: () => void;
}) {
  const t = useT();

  if (waitingForCoords || discovering || !discovery) {
    return (
      <>
        <DestinationOverviewHero
          destinationLabel={destinationLabel}
          loading={discovering || waitingForCoords}
          subtitle={
            discovering || waitingForCoords
              ? t("search.overviewLoading")
              : undefined
          }
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
      <DestinationOverviewHero
        destinationLabel={destinationLabel}
        subtitle={discovery.scope_intro}
      />

      {discovery.weather && (
        <Card className="mb-6 border-brand-100 bg-brand-50/40">
          <CardHeader title={t("search.overviewWeather")} />
          <CardBody className="text-sm text-text-secondary">
            <p>
              {discovery.weather.date_from} – {discovery.weather.date_to}:{" "}
              <strong className="text-text-primary">
                {discovery.weather.avg_temp_min}–{discovery.weather.avg_temp_max}°C
              </strong>
              {discovery.weather.rainy_days > 0 &&
                ` · ${discovery.weather.rainy_days} ${t("search.overviewRainyDays")}`}
              {discovery.weather.avg_uv_index > 5 &&
                ` · UV ~${discovery.weather.avg_uv_index}`}
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              {t("search.overviewWeatherHint")}
            </p>
          </CardBody>
        </Card>
      )}

      <DestinationClimateBudgetPanel
        destinationLabel={destinationLabel}
        lat={destinationLat}
        lon={destinationLon}
      />

      {!discovery.summary.includes("krótki przegląd przed wyborem") &&
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
        {t("search.chooseActivities")}
      </Button>
    </div>
  );
}

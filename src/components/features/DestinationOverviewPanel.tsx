"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DestinationClimateBudgetPanel } from "@/components/features/DestinationClimateBudgetPanel";
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

  const loading = waitingForCoords || (discovering && !discovery);
  const refreshingWeather = discovering && discovery != null;

  return (
    <div className="overview-content-enter">
      {discoveryError && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-text-secondary">
          {discoveryError}
          {!discovering && !waitingForCoords && onRetry && (
            <Button className="mt-3" size="sm" onClick={onRetry}>
              {t("search.discoverRetry")}
            </Button>
          )}
        </div>
      )}

      {(loading || discovery?.weather || refreshingWeather) && (
        <Card className="mb-6 border-brand-100 bg-brand-50/40">
          <CardHeader title={t("search.overviewWeather")} />
          <CardBody className="text-sm text-text-secondary">
            {loading || (refreshingWeather && !discovery?.weather) ? (
              <p>{t("search.overviewLoading")}</p>
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

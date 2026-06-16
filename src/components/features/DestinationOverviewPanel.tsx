"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DestinationClimateBudgetPanel } from "@/components/features/DestinationClimateBudgetPanel";
import { DestinationOverviewHero } from "@/components/features/DestinationOverviewLoader";
import type { DestinationDiscovery } from "@/lib/search/destination-discover";
import type { Activity, ActivityGroup } from "@/types/domain";
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
  taxonomy,
  selectedActivities,
  onToggleActivity,
  onContinue,
}: {
  destinationLabel: string;
  destinationLat?: number | null;
  destinationLon?: number | null;
  discovering: boolean;
  discovery: DestinationDiscovery | null;
  discoveryError?: string | null;
  onRetry?: () => void;
  waitingForCoords?: boolean;
  taxonomy: Array<ActivityGroup & { activities: Activity[] }>;
  selectedActivities: Set<string>;
  onToggleActivity: (slug: string) => void;
  onContinue: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();

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

  const counts = discovery.activity_counts;
  const slugsToShow = new Set([
    ...discovery.suggested_activities,
    ...Object.entries(counts)
      .filter((entry): entry is [string, number] => entry[1] > 0)
      .map(([slug]) => slug),
  ]);

  const foundActivities = taxonomy
    .flatMap((g) =>
      g.activities
        .filter((a) => slugsToShow.has(a.slug))
        .map((a) => ({
          slug: a.slug,
          name: locale === "en" ? a.name_en : a.name_pl,
          group: locale === "en" ? g.name_en : g.name_pl,
          count: counts[a.slug] ?? 0,
        })),
    )
    .sort((a, b) => {
      const aSelected = discovery.suggested_activities.includes(a.slug);
      const bSelected = discovery.suggested_activities.includes(b.slug);
      if (aSelected !== bSelected) return aSelected ? -1 : 1;
      return b.count - a.count;
    });

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

      <Card className="mb-6">
        <CardHeader title={t("search.discoverFoundTitle")} />
        <CardBody className="space-y-4 text-sm text-text-secondary">
          <p className="text-base leading-relaxed text-text-primary">
            {discovery.discovery_intro}
          </p>
          {foundActivities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {foundActivities.map((a) => {
                const selected = selectedActivities.has(a.slug);
                return (
                  <button
                    key={a.slug}
                    type="button"
                    onClick={() => onToggleActivity(a.slug)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      selected
                        ? "bg-brand-700 text-white"
                        : "bg-bg-soft text-text-secondary hover:bg-brand-50 hover:text-brand-700"
                    }`}
                  >
                    {a.name}
                    {a.count > 0 ? (
                      <span
                        className={`ml-1.5 text-xs ${
                          selected ? "text-white/80" : "text-text-tertiary"
                        }`}
                      >
                        ({a.count})
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-text-tertiary">{t("search.discoverFoundEmpty")}</p>
          )}
          <p className="text-xs text-text-tertiary">{t("search.discoverFoundHint")}</p>
        </CardBody>
      </Card>

      <Button
        size="lg"
        disabled={selectedActivities.size === 0}
        onClick={onContinue}
      >
        {t("search.discoverContinue", { n: selectedActivities.size })}
      </Button>
    </div>
  );
}

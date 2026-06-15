"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DestinationOverviewLoader } from "@/components/features/DestinationOverviewLoader";
import type { DestinationDiscovery } from "@/lib/search/destination-discover";
import type { Activity, ActivityGroup } from "@/types/domain";
import { useLocale, useT } from "@/i18n/locale-provider";

function OverviewHero({
  imageUrl,
  title,
  subtitle,
}: {
  imageUrl: string | null;
  title: string;
  subtitle: string;
}) {
  const [sharp, setSharp] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!imageUrl) return;
    setSharp(false);
    setFailed(false);
    const img = new Image();
    img.onload = () => setSharp(true);
    img.onerror = () => setFailed(true);
    img.src = imageUrl;
    if (img.complete && img.naturalWidth > 0) setSharp(true);
  }, [imageUrl]);

  if (!imageUrl || failed) {
    return (
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 p-8 shadow-card">
        <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">{subtitle}</p>
      </div>
    );
  }

  return (
    <div className="overview-reveal relative mb-6 overflow-hidden rounded-2xl shadow-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        className={`overview-reveal-photo h-56 w-full object-cover sm:h-72 ${
          sharp ? "overview-reveal-photo-sharp" : "overview-reveal-photo-blur"
        }`}
        onLoad={() => setSharp(true)}
        onError={() => setFailed(true)}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-900/80 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">{subtitle}</p>
      </div>
    </div>
  );
}

export function DestinationOverviewPanel({
  destinationLabel,
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
    if (discoveryError && !discovering && !waitingForCoords) {
      return (
        <div className="mb-8 rounded-2xl border border-danger/30 bg-orange-50/80 p-6 text-center">
          <p className="font-medium text-text-primary">{t("search.discoverError")}</p>
          <p className="mt-2 text-sm text-text-secondary">{discoveryError}</p>
          {onRetry && (
            <Button className="mt-4" onClick={onRetry}>
              {t("search.discoverRetry")}
            </Button>
          )}
        </div>
      );
    }

    return <DestinationOverviewLoader destinationLabel={destinationLabel} />;
  }

  const counts = discovery.activity_counts;
  const foundActivities = taxonomy
    .flatMap((g) =>
      g.activities
        .filter((a) => (counts[a.slug] ?? 0) > 0)
        .map((a) => ({
          slug: a.slug,
          name: locale === "en" ? a.name_en : a.name_pl,
          group: locale === "en" ? g.name_en : g.name_pl,
          count: counts[a.slug] ?? 0,
        })),
    )
    .sort((a, b) => b.count - a.count);

  return (
    <div className="overview-content-enter">
      <OverviewHero
        imageUrl={discovery.hero_image_url}
        title={discovery.place_name}
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
          </CardBody>
        </Card>
      )}

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
                    <span
                      className={`ml-1.5 text-xs ${
                        selected ? "text-white/80" : "text-text-tertiary"
                      }`}
                    >
                      ({a.count})
                    </span>
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

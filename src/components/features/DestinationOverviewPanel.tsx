"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DestinationOverviewLoader } from "@/components/features/DestinationOverviewLoader";
import type { DestinationOverview } from "@/lib/search/destination-overview-instant";
import { useT } from "@/i18n/locale-provider";

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

  if (!imageUrl) {
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
        onLoad={() => requestAnimationFrame(() => setSharp(true))}
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
  overview,
  waitingForCoords = false,
  onContinue,
}: {
  destinationLabel: string;
  overview: DestinationOverview | null;
  waitingForCoords?: boolean;
  onContinue: () => void;
}) {
  const t = useT();

  if (waitingForCoords || !overview) {
    return (
      <DestinationOverviewLoader
        destinationLabel={destinationLabel}
        waitingForCoords={waitingForCoords}
      />
    );
  }

  return (
    <div className="overview-content-enter">
      <OverviewHero
        imageUrl={overview.hero_image_url}
        title={overview.place_name}
        subtitle={overview.scope_intro}
      />

      <Card className="mb-6">
        <CardHeader title={t("search.overviewUnderstand")} />
        <CardBody className="space-y-3 text-sm text-text-secondary">
          <p className="text-base leading-relaxed text-text-primary">
            {overview.summary}
          </p>
          {overview.enriching && (
            <p className="text-xs text-text-tertiary">{t("search.overviewEnriching")}</p>
          )}
        </CardBody>
      </Card>

      {overview.weather && (
        <Card className="mb-6">
          <CardHeader title={t("search.overviewWeather")} />
          <CardBody className="text-sm text-text-secondary">
            <p>
              {overview.weather.date_from} – {overview.weather.date_to}:{" "}
              <strong className="text-text-primary">
                {overview.weather.avg_temp_min}–{overview.weather.avg_temp_max}°C
              </strong>
              {overview.weather.rainy_days > 0 &&
                ` · ${overview.weather.rainy_days} ${t("search.overviewRainyDays")}`}
              {overview.weather.avg_uv_index > 5 &&
                ` · UV ~${overview.weather.avg_uv_index}`}
            </p>
          </CardBody>
        </Card>
      )}

      <p className="mb-6 text-sm text-text-secondary">
        {t("search.overviewActivitiesHint")}
      </p>

      <Button size="lg" onClick={onContinue}>
        {t("search.continueToActivities")}
      </Button>
    </div>
  );
}

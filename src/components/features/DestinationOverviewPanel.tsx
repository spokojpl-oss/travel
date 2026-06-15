"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DestinationOverviewLoader } from "@/components/features/DestinationOverviewLoader";
import type { DestinationOverview } from "@/lib/search/destination-overview";
import { useT } from "@/i18n/locale-provider";

function excerpt(text: string | undefined, max = 600): string | null {
  if (!text?.trim()) return null;
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max).trim()}…` : t;
}

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
      <Card className="mb-6 overflow-hidden">
        <CardBody className="space-y-3">
          <h2 className="font-display text-2xl font-bold text-text-primary">{title}</h2>
          <p className="text-base text-text-primary">{subtitle}</p>
        </CardBody>
      </Card>
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
  loading,
  waitingForCoords = false,
  error,
  onContinue,
}: {
  destinationLabel: string;
  overview: DestinationOverview | null;
  loading: boolean;
  waitingForCoords?: boolean;
  error: string | null;
  onContinue: () => void;
}) {
  const t = useT();

  if (loading || waitingForCoords || (!overview && !error)) {
    return (
      <DestinationOverviewLoader
        destinationLabel={destinationLabel}
        waitingForCoords={waitingForCoords}
      />
    );
  }

  if (error) {
    return (
      <>
        <DestinationOverviewLoader destinationLabel={destinationLabel} />
        <Card className="mb-8 border-warning/40">
          <CardBody>
            <p className="text-danger">{error}</p>
            <Button className="mt-4" onClick={onContinue}>
              {t("search.continueToActivities")}
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!overview) return null;

  const wv = overview.wikivoyage;
  const placeName =
    overview.destination_label.split(",")[0] ?? overview.destination_label;

  return (
    <div className="overview-content-enter">
      <OverviewHero
        imageUrl={overview.hero_image_url}
        title={placeName}
        subtitle={overview.scope_intro}
      />

      {(wv?.intro || wv?.sections.understand) && (
        <Card className="mb-6">
          <CardHeader title={t("search.overviewUnderstand")} />
          <CardBody className="space-y-4 text-sm text-text-secondary">
            {wv?.intro && <p>{excerpt(wv.intro, 900)}</p>}
            {wv?.sections.understand && <p>{excerpt(wv.sections.understand)}</p>}
          </CardBody>
        </Card>
      )}

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

      {excerpt(wv?.sections.see) && (
        <Card className="mb-6">
          <CardHeader title={t("search.overviewSee")} />
          <CardBody className="text-sm text-text-secondary">
            <p>{excerpt(wv?.sections.see, 1200)}</p>
          </CardBody>
        </Card>
      )}

      {excerpt(wv?.sections.do) && (
        <Card className="mb-6">
          <CardHeader title={t("search.overviewDo")} />
          <CardBody className="space-y-3 text-sm text-text-secondary">
            <p>{excerpt(wv?.sections.do, 1000)}</p>
            <p className="text-text-primary">{t("search.overviewActivitiesHint")}</p>
          </CardBody>
        </Card>
      )}

      {excerpt(wv?.sections.eat) && (
        <Card className="mb-6">
          <CardHeader title={t("search.overviewEat")} />
          <CardBody className="text-sm text-text-secondary">
            <p>{excerpt(wv?.sections.eat, 800)}</p>
          </CardBody>
        </Card>
      )}

      {excerpt(wv?.sections.getAround) && (
        <Card className="mb-6">
          <CardHeader title={t("search.overviewGettingAround")} />
          <CardBody className="text-sm text-text-secondary">
            <p>{excerpt(wv?.sections.getAround, 600)}</p>
          </CardBody>
        </Card>
      )}

      {wv?.sourceUrl && (
        <p className="mb-6 text-xs text-text-tertiary">
          {t("search.overviewSource")}{" "}
          <a
            href={wv.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-700 hover:underline"
          >
            Wikivoyage
          </a>
        </p>
      )}

      <Button size="lg" onClick={onContinue}>
        {t("search.continueToActivities")}
      </Button>
    </div>
  );
}

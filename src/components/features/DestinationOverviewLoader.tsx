"use client";

import { useState } from "react";
import { isAcceptableHeroImageUrl } from "@/lib/destinations/destination-hero-images";
import { resolveHeroImageUrl } from "@/lib/search/destination-overview-instant";
import { useT } from "@/i18n/locale-provider";

export function DestinationOverviewHero({
  destinationLabel,
  subtitle,
  loading = false,
}: {
  destinationLabel: string;
  subtitle?: string;
  loading?: boolean;
}) {
  const t = useT();
  const placeName = destinationLabel.split(",")[0]?.trim() ?? destinationLabel;
  const heroUrlRaw = resolveHeroImageUrl(destinationLabel);
  const heroUrl =
    heroUrlRaw && isAcceptableHeroImageUrl(heroUrlRaw) ? heroUrlRaw : null;
  const [ready, setReady] = useState(!heroUrl);

  const statusLine =
    subtitle ?? (loading ? t("search.overviewLoading") : undefined);

  return (
    <div
      className="relative mb-6 overflow-hidden rounded-2xl shadow-card"
      aria-busy={loading || undefined}
    >
      {!heroUrl || !ready ? (
        <div className="absolute inset-0 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900" />
      ) : null}
      {heroUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroUrl}
          alt=""
          className={`relative h-56 w-full object-cover sm:h-72 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setReady(true)}
        />
      ) : (
        <div className="h-56 sm:h-72" aria-hidden />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-brand-900/75 via-brand-900/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
          {placeName}
        </h2>
        {statusLine && (
          <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">
            {statusLine}
          </p>
        )}
      </div>
    </div>
  );
}

/** @deprecated Use DestinationOverviewHero */
export function DestinationOverviewLoader({
  destinationLabel,
}: {
  destinationLabel: string;
  waitingForCoords?: boolean;
}) {
  return <DestinationOverviewHero destinationLabel={destinationLabel} loading />;
}

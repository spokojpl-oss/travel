"use client";

import { useEffect, useState } from "react";
import { useT } from "@/i18n/locale-provider";

const MESSAGE_KEYS = [
  "search.overviewLoadingGuide",
  "search.overviewLoadingWeather",
  "search.overviewLoadingPhoto",
  "search.overviewLoadingAlmost",
] as const;

export function DestinationOverviewLoader({
  destinationLabel,
  waitingForCoords = false,
}: {
  destinationLabel: string;
  waitingForCoords?: boolean;
}) {
  const t = useT();
  const placeName = destinationLabel.split(",")[0]?.trim() ?? destinationLabel;
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [imageSharp, setImageSharp] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (waitingForCoords) return;

    let cancelled = false;
    fetch(
      `/api/search/destination-hero?label=${encodeURIComponent(destinationLabel)}`,
    )
      .then((r) => (r.ok ? r.json() : { image_url: null }))
      .then((data: { image_url?: string | null }) => {
        if (!cancelled && data.image_url) setHeroUrl(data.image_url);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [destinationLabel, waitingForCoords]);

  useEffect(() => {
    if (waitingForCoords) return;
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGE_KEYS.length);
    }, 2600);
    return () => clearInterval(interval);
  }, [waitingForCoords]);

  const statusMessage = waitingForCoords
    ? t("search.overviewLoadingCoords")
    : t(MESSAGE_KEYS[messageIndex]);

  return (
    <div
      className="overview-loader relative mb-8 min-h-[28rem] overflow-hidden rounded-2xl shadow-hero"
      aria-busy="true"
      aria-live="polite"
    >
      {heroUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroUrl}
          alt=""
          className={`overview-loader-photo absolute inset-0 h-full w-full object-cover ${
            imageSharp ? "overview-loader-photo-sharp" : "overview-loader-photo-blur"
          }`}
          onLoad={() => {
            requestAnimationFrame(() => setImageSharp(true));
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900" />
      )}

      <div className="overview-loader-shimmer absolute inset-0 opacity-30" />

      <div className="absolute inset-0 bg-gradient-to-t from-brand-900/95 via-brand-900/55 to-brand-900/20" />

      <div className="relative z-10 flex h-full min-h-[28rem] flex-col justify-end p-6 sm:p-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="overview-loader-orbit flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/10 backdrop-blur-sm">
            <svg
              className="overview-loader-compass h-6 w-6 text-white"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M12 4v4M12 16v4M4 12h4M16 12h4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M12 7l2.5 7.5L12 14l-2.5.5L12 7z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              {t("search.overviewLoadingLabel")}
            </p>
            <p className="overview-loader-status text-sm text-white/90 sm:text-base">
              {statusMessage}
            </p>
          </div>
        </div>

        <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
          {placeName}
        </h2>

        <div className="mt-5 max-w-md space-y-2">
          <div className="overview-loader-line overview-loader-line-1 h-2 rounded-full bg-white/25" />
          <div className="overview-loader-line overview-loader-line-2 h-2 w-4/5 rounded-full bg-white/20" />
          <div className="overview-loader-line overview-loader-line-3 h-2 w-3/5 rounded-full bg-white/15" />
        </div>
      </div>
    </div>
  );
}

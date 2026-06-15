"use client";

import { resolveHeroImageUrl } from "@/lib/search/destination-overview-instant";

export function DestinationOverviewLoader({
  destinationLabel,
  waitingForCoords = false,
}: {
  destinationLabel: string;
  waitingForCoords?: boolean;
}) {
  const placeName = destinationLabel.split(",")[0]?.trim() ?? destinationLabel;
  const heroUrl = resolveHeroImageUrl(destinationLabel);

  return (
    <div
      className="overview-loader relative mb-8 min-h-[20rem] overflow-hidden rounded-2xl shadow-hero sm:min-h-[24rem]"
      aria-busy="true"
      aria-live="polite"
    >
      {heroUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroUrl}
          alt=""
          className="overview-loader-photo overview-loader-photo-sharp absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900" />
      )}

      <div className="overview-loader-shimmer absolute inset-0 opacity-20" />

      <div className="absolute inset-0 bg-gradient-to-t from-brand-900/95 via-brand-900/50 to-brand-900/15" />

      <div className="relative z-10 flex h-full min-h-[20rem] flex-col justify-end p-6 sm:min-h-[24rem] sm:p-10">
        <div className="mb-4 flex items-center gap-3">
          <div className="overview-loader-orbit flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 backdrop-blur-sm">
            <svg
              className="overview-loader-compass h-5 w-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M12 7l2.5 7.5L12 14l-2.5.5L12 7z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>

        <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
          {placeName}
        </h2>

        {waitingForCoords && (
          <div className="mt-5 max-w-md space-y-2">
            <div className="overview-loader-line overview-loader-line-1 h-2 rounded-full bg-white/25" />
            <div className="overview-loader-line overview-loader-line-2 h-2 w-4/5 rounded-full bg-white/20" />
          </div>
        )}
      </div>
    </div>
  );
}

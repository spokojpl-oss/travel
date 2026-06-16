"use client";

import { useState } from "react";
import { isAcceptableHeroImageUrl } from "@/lib/destinations/destination-hero-images";
import { resolveHeroImageUrl } from "@/lib/search/destination-overview-instant";

export function DestinationOverviewLoader({
  destinationLabel,
}: {
  destinationLabel: string;
  waitingForCoords?: boolean;
}) {
  const placeName = destinationLabel.split(",")[0]?.trim() ?? destinationLabel;
  const heroUrlRaw = resolveHeroImageUrl(destinationLabel);
  const heroUrl =
    heroUrlRaw && isAcceptableHeroImageUrl(heroUrlRaw) ? heroUrlRaw : null;
  const [imageSharp, setImageSharp] = useState(false);

  return (
    <div
      className="overview-loader relative mb-8 min-h-[22rem] overflow-hidden rounded-2xl shadow-hero sm:min-h-[26rem]"
      aria-busy="true"
      aria-live="polite"
      aria-label={placeName}
    >
      {heroUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroUrl}
          alt=""
          className={`overview-loader-photo absolute inset-0 h-full w-full object-cover ${
            imageSharp ? "overview-loader-photo-sharp" : "overview-loader-photo-blur"
          }`}
          onLoad={() => requestAnimationFrame(() => setImageSharp(true))}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900" />
      )}

      <div className="overview-loader-shimmer absolute inset-0 opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-900/95 via-brand-900/55 to-brand-900/20" />

      <div className="relative z-10 flex h-full min-h-[22rem] flex-col justify-end p-6 sm:min-h-[26rem] sm:p-10">
        <div className="mb-5 flex items-center gap-4">
          <div className="overview-loader-orbit flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-md">
            <svg
              className="overview-loader-compass h-6 w-6 text-white"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 7l2.5 7.5L12 14l-2.5.5L12 7z" fill="currentColor" />
            </svg>
          </div>
        </div>

        <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
          {placeName}
        </h2>

        <div className="mt-5 max-w-lg space-y-2">
          <div className="overview-loader-line overview-loader-line-1 h-2 rounded-full bg-white/30" />
          <div className="overview-loader-line overview-loader-line-2 h-2 w-[85%] rounded-full bg-white/22" />
          <div className="overview-loader-line overview-loader-line-3 h-2 w-[65%] rounded-full bg-white/16" />
        </div>
      </div>
    </div>
  );
}

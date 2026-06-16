"use client";

import { isAcceptableHeroImageUrl } from "@/lib/destinations/destination-hero-images";
import type { DestinationStory } from "@/lib/plan/destination-story";
import { useLocale } from "@/i18n/locale-provider";

export function DestinationStoryHero({
  story,
  tripDays,
  subtitle,
  loading = false,
  badges,
}: {
  story: DestinationStory;
  tripDays?: number;
  subtitle?: string;
  loading?: boolean;
  badges?: Array<{ label: string; variant?: "brand" | "muted" }>;
}) {
  const { locale } = useLocale();
  const pl = locale !== "en";
  const heroUrl =
    story.heroImageUrl && isAcceptableHeroImageUrl(story.heroImageUrl)
      ? story.heroImageUrl
      : null;
  const showRegions = story.regionHighlights.length > 1;

  return (
    <section className="relative mb-6 overflow-hidden rounded-3xl border border-brand-100 shadow-lg">
      {heroUrl ? (
        <div className="relative min-h-[240px] sm:min-h-[280px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />
          <div className="relative flex min-h-[240px] flex-col justify-end p-6 sm:min-h-[280px] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-200">
              {pl ? "Co możesz zobaczyć" : "What you can see"}
            </p>
            <h2 className="font-display mt-2 max-w-2xl text-2xl font-bold leading-tight text-white sm:text-3xl">
              {story.headline}
            </h2>
            {story.country && (
              <p className="mt-2 text-sm font-medium text-white/80">
                {story.placeName} · {story.country}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-brand-800 to-brand-600 p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-200">
            {pl ? "Co możesz zobaczyć" : "What you can see"}
          </p>
          <h2 className="font-display mt-2 text-2xl font-bold text-white sm:text-3xl">
            {story.headline}
          </h2>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-sm text-white/90">{subtitle}</p>
          )}
        </div>
      )}

      <div className="space-y-4 bg-white p-6 sm:p-8">
        <p className="text-lg leading-relaxed text-text-primary">{story.phenomenon}</p>
        {story.intro.trim() && (
          <p className="text-sm leading-relaxed text-text-secondary">{story.intro}</p>
        )}

        {(tripDays != null || (badges && badges.length > 0)) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {tripDays != null && (
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
                {tripDays} {pl ? "dni wyjazdu" : "trip days"}
              </span>
            )}
            {badges?.map((badge) => (
              <span
                key={badge.label}
                className={
                  badge.variant === "brand"
                    ? "rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800"
                    : "rounded-full bg-bg-soft px-3 py-1 text-xs font-medium text-text-secondary"
                }
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}

        {showRegions && (
          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            {story.regionHighlights.slice(0, 4).map((r) => (
              <div
                key={r.name}
                className="rounded-xl border border-border-default bg-bg-soft/50 px-4 py-3"
              >
                <p className="font-semibold text-text-primary">{r.name}</p>
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-text-secondary">
                  {r.teaser}
                </p>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <p className="text-sm text-text-tertiary">
            {pl ? "Dopasowujemy pogodę i szczegóły…" : "Loading weather and details…"}
          </p>
        )}
      </div>
    </section>
  );
}

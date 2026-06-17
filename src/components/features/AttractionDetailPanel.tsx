"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { toPolishAttractionName } from "@/lib/plan/attraction-display-name";
import type { AttractionWithActivities } from "@/types/domain";
import { useLocale, useT } from "@/i18n/locale-provider";

type TaxonomyActivity = { slug: string; name_pl: string; name_en: string };

type GoogleReview = {
  author: string;
  rating: number;
  text: string;
  publishedAt: string | null;
};

type DetailResponse = {
  overview?: string | null;
  highlights?: string[];
  message?: string;
  wikipediaUrl?: string;
  wikipediaSearchUrl?: string;
  google?: {
    rating: number | null;
    ratingCount: number | null;
    googleMapsUrl: string | null;
    website: string | null;
    photoUrls: string[];
    reviews: GoogleReview[];
  };
};

function activityLabel(
  slug: string,
  activityNames: Record<string, string>,
  taxonomyActivities: TaxonomyActivity[],
  locale: "pl" | "en",
): string {
  return (
    taxonomyActivities.find((a) => a.slug === slug)?.[
      locale === "en" ? "name_en" : "name_pl"
    ] ??
    activityNames[slug] ??
    slug
  );
}

function StarRating({ rating, count, locale }: { rating: number; count: number | null; locale: "pl" | "en" }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-semibold text-amber-700">{rating.toFixed(1)}</span>
      <span className="text-amber-500" aria-hidden>
        {"★".repeat(Math.round(rating))}
        {"☆".repeat(Math.max(0, 5 - Math.round(rating)))}
      </span>
      {count != null && count > 0 && (
        <span className="text-xs text-text-secondary">
          {locale === "en" ? `${count.toLocaleString()} reviews` : `${count.toLocaleString()} opinii`}
        </span>
      )}
    </div>
  );
}

export function AttractionDetailPanel({
  attraction,
  activityNames,
  taxonomyActivities,
  inPlan,
  onTogglePlan,
}: {
  attraction: AttractionWithActivities;
  activityNames: Record<string, string>;
  taxonomyActivities: TaxonomyActivity[];
  inPlan: boolean;
  onTogglePlan: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const name = toPolishAttractionName(attraction.name, locale);
  const tags = attraction.activity_tags.map((tag) =>
    activityLabel(tag.activity_slug, activityNames, taxonomyActivities, locale),
  );

  const [overview, setOverview] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [noDetailMessage, setNoDetailMessage] = useState<string | null>(null);
  const [wikipediaUrl, setWikipediaUrl] = useState<string | null>(null);
  const [google, setGoogle] = useState<DetailResponse["google"]>(undefined);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [failedPhotoUrls, setFailedPhotoUrls] = useState<Set<string>>(
    () => new Set(),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setOverview(null);
    setHighlights([]);
    setNoDetailMessage(null);
    setWikipediaUrl(null);
    setGoogle(undefined);
    setPhotoIndex(0);
    setFailedPhotoUrls(new Set());

    fetch("/api/search/attraction-detail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: attraction.id, locale }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<DetailResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        setOverview(data.overview?.trim() || null);
        setHighlights(data.highlights ?? []);
        setNoDetailMessage(data.message ?? null);
        setWikipediaUrl(data.wikipediaUrl ?? data.wikipediaSearchUrl ?? null);
        setGoogle(data.google);
      })
      .catch(() => {
        if (cancelled) return;
        setNoDetailMessage(
          locale === "en"
            ? "Could not load a description."
            : "Nie udało się wczytać opisu.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attraction.id, locale]);

  const photos = (google?.photoUrls ?? []).filter((url) => !failedPhotoUrls.has(url));
  const activePhotoIndex = Math.min(photoIndex, Math.max(0, photos.length - 1));
  const activePhotoUrl = photos[activePhotoIndex];
  const hasContent = Boolean(
    overview ||
      photos.length > 0 ||
      (google?.reviews.length ?? 0) > 0 ||
      (google?.rating != null && google.rating > 0),
  );
  const website = google?.website?.trim() || attraction.website?.trim() || null;
  const mapsUrl = google?.googleMapsUrl ?? null;

  return (
    <div className="flex flex-col gap-3">
      {activePhotoUrl && (
        <div className="relative overflow-hidden rounded-xl border border-border-default">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activePhotoUrl}
            alt=""
            className="aspect-[16/10] w-full object-cover"
            onError={() => {
              setFailedPhotoUrls((prev) => {
                const next = new Set(prev);
                next.add(activePhotoUrl);
                return next;
              });
              setPhotoIndex(0);
            }}
          />
          {photos.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Photo ${i + 1}`}
                  onClick={() => setPhotoIndex(i)}
                  className={`h-1.5 w-1.5 rounded-full ${
                    i === activePhotoIndex ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="font-display text-lg font-bold leading-tight text-text-primary">
          {name}
        </h3>
        {google?.rating != null && google.rating > 0 && (
          <div className="mt-1.5">
            <StarRating rating={google.rating} count={google.ratingCount} locale={locale} />
          </div>
        )}
        {tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-bg-soft px-2 py-0.5 text-[11px] font-medium text-text-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-text-secondary">{t("island.detailLoading")}</p>
      ) : hasContent ? (
        <>
          {overview && (
            <p className="text-sm leading-relaxed text-text-primary">{overview}</p>
          )}
          {highlights.length > 0 && (
            <ul className="space-y-1.5">
              {highlights.map((line) => (
                <li
                  key={line}
                  className="rounded-md border border-border-default/80 px-2.5 py-1.5 text-xs text-text-secondary"
                >
                  {line}
                </li>
              ))}
            </ul>
          )}
          {(google?.reviews.length ?? 0) > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                {t("island.travellerReviews")}
              </p>
              {google!.reviews.slice(0, 3).map((review) => (
                <blockquote
                  key={`${review.author}-${review.publishedAt}`}
                  className="rounded-lg border border-border-default/80 bg-bg-soft/40 px-3 py-2"
                >
                  <p className="text-xs leading-relaxed text-text-primary">
                    &ldquo;{review.text.length > 220 ? `${review.text.slice(0, 218).trim()}…` : review.text}&rdquo;
                  </p>
                  <footer className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-text-secondary">
                    <span className="font-medium">{review.author}</span>
                    <span className="text-amber-600">{"★".repeat(review.rating)}</span>
                    {review.publishedAt && <span>{review.publishedAt}</span>}
                  </footer>
                </blockquote>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-700 hover:underline"
              >
                {t("island.openInMaps")} →
              </a>
            )}
            {wikipediaUrl && (
              <a
                href={wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-700 hover:underline"
              >
                {t("island.searchWikipedia")} →
              </a>
            )}
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-700 hover:underline"
              >
                {t("island.websiteLink")} →
              </a>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-md border border-amber-200/80 bg-amber-50/50 px-3 py-2.5 text-sm text-text-secondary">
          <p>{noDetailMessage ?? t("island.noDetail")}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
            {wikipediaUrl && (
              <a
                href={wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-700 hover:underline"
              >
                {t("island.searchWikipedia")} →
              </a>
            )}
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-700 hover:underline"
              >
                {t("island.openInMaps")} →
              </a>
            )}
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-700 hover:underline"
              >
                {t("island.websiteLink")} →
              </a>
            )}
          </div>
        </div>
      )}

      {attraction.duration_minutes != null && attraction.duration_minutes > 0 && (
        <p className="text-xs text-text-secondary">
          {locale === "en" ? "Visit time" : "Czas wizyty"}: ~
          {Math.max(1, Math.round(attraction.duration_minutes / 60))}h
        </p>
      )}

      {overview && attraction.address?.trim() && (
        <p className="text-xs text-text-tertiary">{attraction.address.trim()}</p>
      )}

      <div className="border-t border-border-default pt-3">
        <Button
          size="sm"
          className="w-full"
          variant={inPlan ? "secondary" : "primary"}
          onClick={onTogglePlan}
        >
          {inPlan ? t("island.removeFromPlan") : t("island.addToPlan")}
        </Button>
      </div>
    </div>
  );
}

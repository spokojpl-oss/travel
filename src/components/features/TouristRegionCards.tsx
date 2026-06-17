"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import {
  pickDisplayName,
  pickWhy,
  regionAreaLabel,
  regionDisplayName,
  regionCharacterLabel,
  regionVibeLabel,
  type ScoredTouristRegion,
} from "@/lib/destinations/tourist-regions";
import { RECOMMENDED_TOURIST_REGIONS } from "@/lib/search/trip-context";
import { isCompactIslandDestination } from "@/lib/search/destination-size";
import { useLocale, useT } from "@/i18n/locale-provider";
import {
  RegionSelectionMap,
  regionMapsSearchUrl,
} from "@/components/features/RegionSelectionMap";

function RegionDetailPanel({
  region,
  index,
  isConfirmed,
  onConfirm,
  onRemove,
}: {
  region: ScoredTouristRegion;
  index: number;
  isConfirmed: boolean;
  onConfirm: () => void;
  onRemove: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const seedOverview = locale === "en" ? region.overview_en : region.overview_pl;
  const stayHint = locale === "en" ? region.stay_hint_en : region.stay_hint_pl;
  const areaLabel = regionAreaLabel(region, locale);
  const topPicks = region.picks_for_rhythm.slice(0, 2);

  const [overview, setOverview] = useState(seedOverview);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setOverview(seedOverview);
    setHeroImageUrl(null);
    setGoogleMapsUrl(null);
    setRating(null);
    setRatingCount(null);
    setDetailLoading(true);

    fetch("/api/search/region-detail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regionId: region.id, locale }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{
          overview?: string;
          heroImageUrl?: string | null;
          googleMapsUrl?: string;
          rating?: number | null;
          ratingCount?: number | null;
        }>;
      })
      .then((data) => {
        if (cancelled) return;
        if (data.overview?.trim()) setOverview(data.overview.trim());
        setHeroImageUrl(data.heroImageUrl ?? null);
        setGoogleMapsUrl(data.googleMapsUrl ?? null);
        setRating(data.rating ?? null);
        setRatingCount(data.ratingCount ?? null);
      })
      .catch(() => {
        /* seed overview zostaje */
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [region.id, locale, seedOverview]);

  return (
    <div className="flex flex-col gap-3">
      {heroImageUrl && (
        <div className="overflow-hidden rounded-xl border border-border-default">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImageUrl}
            alt=""
            className="aspect-[16/10] w-full object-cover"
          />
        </div>
      )}

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
          #{index + 1}
          {areaLabel && (
            <span className="ml-1.5 normal-case font-normal text-text-secondary">
              · {areaLabel}
            </span>
          )}
        </p>
        <h3 className="font-display mt-0.5 text-lg font-bold leading-tight text-text-primary">
          {regionDisplayName(region, locale)}
        </h3>
        {rating != null && rating > 0 && (
          <p className="mt-1 text-xs text-text-secondary">
            <span className="font-semibold text-amber-700">{rating.toFixed(1)}</span>
            {" · "}
            {locale === "en"
              ? `${(ratingCount ?? 0).toLocaleString()} Google reviews`
              : `${(ratingCount ?? 0).toLocaleString()} opinii Google`}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-bg-soft px-2 py-0.5 text-[11px] font-medium text-text-secondary">
            {regionCharacterLabel(region.character, locale)}
          </span>
          <span className="rounded-full bg-bg-soft px-2 py-0.5 text-[11px] font-medium text-text-secondary">
            {regionVibeLabel(region.vibe, locale)}
          </span>
        </div>
      </div>

      {detailLoading ? (
        <p className="text-sm text-text-secondary">{t("regions.detailLoading")}</p>
      ) : (
        <p className="text-sm leading-relaxed text-text-primary">{overview}</p>
      )}
      <p className="rounded-md border border-brand-100 bg-brand-50/40 px-2.5 py-2 text-xs leading-snug text-text-secondary">
        {stayHint}
      </p>

      {topPicks.length > 0 && (
        <ul className="space-y-1.5">
          {topPicks.map((pick) => (
            <li
              key={`${pick.day_theme}-${pick.name_pl}`}
              className="rounded-md border border-border-default/80 px-2.5 py-1.5 text-xs"
            >
              <span className="font-medium text-text-primary">
                {pickDisplayName(pick, locale)}
              </span>
              <span className="text-text-secondary"> — {pickWhy(pick, locale)}</span>
            </li>
          ))}
        </ul>
      )}

      <a
        href={googleMapsUrl ?? regionMapsSearchUrl(region, locale)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] font-semibold text-brand-700 hover:underline"
      >
        {t("regions.viewOnMap")} →
      </a>

      {isConfirmed ? (
        <div className="space-y-2 border-t border-border-default pt-3">
          <p className="text-xs font-medium text-brand-800">
            {t("regions.confirmedInSelection")}
          </p>
          <Button variant="secondary" size="sm" className="w-full" onClick={onRemove}>
            {t("regions.removeFromSelection")}
          </Button>
        </div>
      ) : (
        <div className="border-t border-border-default pt-3">
          <Button size="sm" className="w-full" onClick={onConfirm}>
            {t("regions.confirmRegion")}
          </Button>
        </div>
      )}
    </div>
  );
}

export function TouristRegionCards({
  regions,
  selectedIds,
  onSelectedIdsChange,
  onContinue,
  onBack,
  onSkip,
  destinationLabel = "",
  onChooseWholeIsland,
}: {
  regions: ScoredTouristRegion[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onContinue: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  destinationLabel?: string;
  onChooseWholeIsland?: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const showWholeIsland =
    Boolean(onChooseWholeIsland) &&
    isCompactIslandDestination(destinationLabel);

  const recommendedIds = useMemo(
    () => regions.slice(0, RECOMMENDED_TOURIST_REGIONS).map((r) => r.id),
    [regions],
  );

  const [focusedId, setFocusedId] = useState<string | null>(
    () => selectedIds[0] ?? regions[0]?.id ?? null,
  );

  useEffect(() => {
    if (focusedId && regions.some((r) => r.id === focusedId)) return;
    setFocusedId(selectedIds[0] ?? regions[0]?.id ?? null);
  }, [regions, focusedId, selectedIds]);

  const focusedRegion = useMemo(
    () => regions.find((r) => r.id === focusedId) ?? null,
    [regions, focusedId],
  );

  const focusedIndex = focusedRegion
    ? regions.findIndex((r) => r.id === focusedRegion.id)
    : -1;

  const confirmedRegions = useMemo(
    () =>
      selectedIds
        .map((id) => regions.find((r) => r.id === id))
        .filter((r): r is ScoredTouristRegion => r != null),
    [selectedIds, regions],
  );

  const allSelected =
    regions.length > 0 && regions.every((r) => selectedIds.includes(r.id));
  const recommendedSelected =
    recommendedIds.length > 0 &&
    recommendedIds.every((id) => selectedIds.includes(id));

  function confirmRegion(region: ScoredTouristRegion) {
    if (selectedIds.includes(region.id)) return;
    onSelectedIdsChange([...selectedIds, region.id]);
  }

  function removeRegion(regionId: string) {
    onSelectedIdsChange(selectedIds.filter((id) => id !== regionId));
  }

  function selectRecommended() {
    onSelectedIdsChange([...recommendedIds]);
  }

  function selectAll() {
    onSelectedIdsChange(regions.map((r) => r.id));
  }

  function clearSelection() {
    onSelectedIdsChange([]);
  }

  if (regions.length === 0) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardBody className="space-y-4 text-center">
          <Icon name="info" size={28} className="mx-auto text-amber-700" />
          <p className="font-medium text-text-primary">{t("regions.emptyTitle")}</p>
          <p className="text-sm text-text-secondary">{t("regions.emptyBody")}</p>
          {onBack && (
            <Button variant="secondary" onClick={onBack}>
              {t("regions.adjustRhythm")}
            </Button>
          )}
          <Button variant="ghost" onClick={onContinue}>
            {t("regions.skipToActivities")}
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">{t("regions.introDesktop")}</p>

      <Card className="border-border-default bg-bg-soft/40">
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm text-text-secondary">{t("regions.recommendedHint")}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={recommendedSelected}
              onClick={selectRecommended}
            >
              {t("regions.selectRecommended", { count: recommendedIds.length })}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={allSelected}
              onClick={selectAll}
            >
              {t("regions.selectAll", { count: regions.length })}
            </Button>
            {selectedIds.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                {t("regions.clearSelection")}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {showWholeIsland && (
        <Card className="border-brand-200 bg-brand-50/40">
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-base font-bold text-text-primary">
                {t("regions.wholeIslandTitle")}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {t("regions.wholeIslandBody")}
              </p>
            </div>
            <Button className="shrink-0" onClick={onChooseWholeIsland}>
              {t("regions.wholeIslandCta")}
            </Button>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] lg:items-start lg:gap-4">
        <RegionSelectionMap
          regions={regions}
          focusedId={focusedId}
          selectedIds={selectedIds}
          onFocus={setFocusedId}
          destinationLabel={destinationLabel}
          className="min-w-0"
        />

        <aside className="max-h-[min(72vh,640px)] overflow-y-auto rounded-xl border border-border-default bg-white p-3 shadow-card lg:w-full lg:max-w-[300px] lg:justify-self-end">
          {confirmedRegions.length > 0 && (
            <div className="mb-3 border-b border-border-default pb-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                {t("regions.yourSelection")} (
                {t("regions.selectionCount", {
                  selected: confirmedRegions.length,
                  total: regions.length,
                })}
                )
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {confirmedRegions.map((region) => (
                  <li key={region.id}>
                    <button
                      type="button"
                      onClick={() => setFocusedId(region.id)}
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                        focusedId === region.id
                          ? "border-brand-700 bg-brand-50 text-brand-800"
                          : "border-border-default bg-bg-soft text-text-secondary hover:border-brand-200",
                      )}
                    >
                      {regionDisplayName(region, locale)}
                    </button>
                  </li>
                ))}
              </ul>
              {selectedIds.length > RECOMMENDED_TOURIST_REGIONS && (
                <p className="mt-2 text-[11px] text-text-secondary">
                  {t("regions.manySelectedHint", { count: selectedIds.length })}
                </p>
              )}
            </div>
          )}

          {focusedRegion && focusedIndex >= 0 ? (
            <RegionDetailPanel
              key={focusedRegion.id}
              region={focusedRegion}
              index={focusedIndex}
              isConfirmed={selectedIds.includes(focusedRegion.id)}
              onConfirm={() => confirmRegion(focusedRegion)}
              onRemove={() => removeRegion(focusedRegion.id)}
            />
          ) : (
            <p className="py-8 text-center text-sm text-text-secondary">
              {t("regions.clickMapHint")}
            </p>
          )}
        </aside>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-border-default pt-4">
        <Button size="lg" disabled={selectedIds.length === 0} onClick={onContinue}>
          {selectedIds.length > 1
            ? t("regions.continueMulti", { count: selectedIds.length })
            : t("regions.continue")}
        </Button>
        {onSkip && (
          <Button variant="ghost" onClick={onSkip}>
            {t("regions.skipToActivities")}
          </Button>
        )}
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            {t("regions.adjustRhythm")}
          </Button>
        )}
      </div>
    </div>
  );
}

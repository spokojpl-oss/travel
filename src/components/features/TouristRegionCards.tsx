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
import { MAX_TOURIST_REGIONS } from "@/lib/search/trip-context";
import { useLocale, useT } from "@/i18n/locale-provider";
import {
  RegionSelectionMap,
  regionMapsSearchUrl,
} from "@/components/features/RegionSelectionMap";

function RegionDetailPanel({
  region,
  index,
  isConfirmed,
  canAddMore,
  onConfirm,
  onRemove,
}: {
  region: ScoredTouristRegion;
  index: number;
  isConfirmed: boolean;
  canAddMore: boolean;
  onConfirm: () => void;
  onRemove: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const overview = locale === "en" ? region.overview_en : region.overview_pl;
  const stayHint = locale === "en" ? region.stay_hint_en : region.stay_hint_pl;
  const areaLabel = regionAreaLabel(region, locale);
  const topPicks = region.picks_for_rhythm.slice(0, 2);

  return (
    <div className="flex flex-col gap-3">
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
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-bg-soft px-2 py-0.5 text-[11px] font-medium text-text-secondary">
            {regionCharacterLabel(region.character, locale)}
          </span>
          <span className="rounded-full bg-bg-soft px-2 py-0.5 text-[11px] font-medium text-text-secondary">
            {regionVibeLabel(region.vibe, locale)}
          </span>
        </div>
      </div>

      <p className="text-sm leading-snug text-text-primary">{overview}</p>
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
        href={regionMapsSearchUrl(region, locale)}
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
          <Button
            size="sm"
            className="w-full"
            disabled={!canAddMore}
            onClick={onConfirm}
          >
            {t("regions.confirmRegion")}
          </Button>
          {!canAddMore && (
            <p className="mt-1.5 text-center text-[11px] text-text-secondary">
              {t("regions.maxRegionsHint", { max: MAX_TOURIST_REGIONS })}
            </p>
          )}
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
}: {
  regions: ScoredTouristRegion[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onContinue: () => void;
  onBack?: () => void;
  onSkip?: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();

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

  function confirmRegion(region: ScoredTouristRegion) {
    if (selectedIds.includes(region.id)) return;
    if (selectedIds.length >= MAX_TOURIST_REGIONS) return;
    onSelectedIdsChange([...selectedIds, region.id]);
  }

  function removeRegion(regionId: string) {
    onSelectedIdsChange(selectedIds.filter((id) => id !== regionId));
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

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] lg:items-start lg:gap-4">
        <RegionSelectionMap
          regions={regions}
          focusedId={focusedId}
          selectedIds={selectedIds}
          onFocus={setFocusedId}
          className="min-w-0"
        />

        <aside className="max-h-[min(72vh,640px)] overflow-y-auto rounded-xl border border-border-default bg-white p-3 shadow-card lg:w-full lg:max-w-[300px] lg:justify-self-end">
          {confirmedRegions.length > 0 && (
            <div className="mb-3 border-b border-border-default pb-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                {t("regions.yourSelection")} ({confirmedRegions.length}/
                {MAX_TOURIST_REGIONS})
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
            </div>
          )}

          {focusedRegion && focusedIndex >= 0 ? (
            <RegionDetailPanel
              key={focusedRegion.id}
              region={focusedRegion}
              index={focusedIndex}
              isConfirmed={selectedIds.includes(focusedRegion.id)}
              canAddMore={selectedIds.length < MAX_TOURIST_REGIONS}
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

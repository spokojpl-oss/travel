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

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border-default px-1 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
          {t("regions.hintLabel")} #{index + 1}
          {areaLabel && (
            <span className="ml-2 normal-case font-normal text-text-secondary">
              · {areaLabel}
            </span>
          )}
        </p>
        <h3 className="font-display mt-1 text-2xl font-bold text-text-primary">
          {regionDisplayName(region, locale)}
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full bg-bg-soft px-2.5 py-0.5 text-xs font-medium text-text-secondary">
            {regionCharacterLabel(region.character, locale)}
          </span>
          <span className="rounded-full bg-bg-soft px-2.5 py-0.5 text-xs font-medium text-text-secondary">
            {regionVibeLabel(region.vibe, locale)}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto py-4 pr-1">
        <p className="text-sm leading-relaxed text-text-primary">{overview}</p>
        <p className="rounded-lg border border-brand-100 bg-brand-50/50 px-3 py-2 text-sm leading-relaxed text-text-secondary">
          {stayHint}
        </p>

        {region.picks_for_rhythm.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              {t("regions.picksTitle")}
            </p>
            <ul className="space-y-2">
              {region.picks_for_rhythm.map((pick) => (
                <li
                  key={`${pick.day_theme}-${pick.name_pl}`}
                  className="rounded-lg border border-border-default bg-white px-3 py-2"
                >
                  <p className="font-medium text-text-primary">
                    {pickDisplayName(pick, locale)}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                    {pickWhy(pick, locale)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <a
          href={regionMapsSearchUrl(region, locale)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex text-xs font-semibold text-brand-700 hover:underline"
        >
          {t("regions.viewOnMap")} →
        </a>
      </div>

      <div className="border-t border-border-default pt-4">
        {isConfirmed ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-brand-800">
              {t("regions.confirmedInSelection")}
            </p>
            <Button variant="secondary" className="w-full" onClick={onRemove}>
              {t("regions.removeFromSelection")}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              className="w-full"
              disabled={!canAddMore}
              onClick={onConfirm}
            >
              {t("regions.confirmRegion")}
            </Button>
            {!canAddMore && (
              <p className="text-center text-xs text-text-secondary">
                {t("regions.maxRegionsHint", { max: MAX_TOURIST_REGIONS })}
              </p>
            )}
          </div>
        )}
      </div>
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
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-text-secondary">
        {t("regions.introDesktop")}
      </p>

      <div className="lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-8">
        <div className="lg:sticky lg:top-4">
          <RegionSelectionMap
            regions={regions}
            focusedId={focusedId}
            selectedIds={selectedIds}
            onFocus={setFocusedId}
            height={420}
            className="lg:min-h-[min(72vh,640px)]"
          />
        </div>

        <div className="mt-6 flex min-h-[420px] flex-col rounded-2xl border border-border-default bg-white p-5 shadow-card lg:mt-0 lg:min-h-[min(72vh,640px)]">
          {confirmedRegions.length > 0 && (
            <div className="mb-4 border-b border-border-default pb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                {t("regions.yourSelection")} ({confirmedRegions.length}/
                {MAX_TOURIST_REGIONS})
              </p>
              <ul className="flex flex-wrap gap-2">
                {confirmedRegions.map((region, i) => (
                  <li key={region.id}>
                    <button
                      type="button"
                      onClick={() => setFocusedId(region.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        focusedId === region.id
                          ? "border-brand-700 bg-brand-50 text-brand-800"
                          : "border-border-default bg-bg-soft text-text-secondary hover:border-brand-200",
                      )}
                    >
                      <span className="font-bold text-brand-700">{i + 1}.</span>
                      {regionDisplayName(region, locale)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {focusedRegion && focusedIndex >= 0 ? (
            <RegionDetailPanel
              region={focusedRegion}
              index={focusedIndex}
              isConfirmed={selectedIds.includes(focusedRegion.id)}
              canAddMore={selectedIds.length < MAX_TOURIST_REGIONS}
              onConfirm={() => confirmRegion(focusedRegion)}
              onRemove={() => removeRegion(focusedRegion.id)}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center text-text-secondary">
              <Icon name="map-pin" size={32} className="mb-3 opacity-40" />
              <p className="text-sm">{t("regions.clickMapHint")}</p>
            </div>
          )}
        </div>
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

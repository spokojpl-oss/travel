"use client";

import { useRef } from "react";
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
import { useLocale, useT } from "@/i18n/locale-provider";
import {
  RegionSelectionMap,
  regionMapsSearchUrl,
} from "@/components/features/RegionSelectionMap";

export function TouristRegionCards({
  regions,
  selectedId,
  onSelect,
  onContinue,
  onBack,
  onSkip,
}: {
  regions: ScoredTouristRegion[];
  selectedId: string | null;
  onSelect: (region: ScoredTouristRegion) => void;
  onContinue: () => void;
  onBack?: () => void;
  onSkip?: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function handleSelect(region: ScoredTouristRegion) {
    onSelect(region);
    requestAnimationFrame(() => {
      cardRefs.current[region.id]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
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
        {t("regions.introHints")}
      </p>

      <RegionSelectionMap
        regions={regions}
        selectedId={selectedId}
        onSelect={handleSelect}
      />

      <div className="space-y-4">
        {regions.map((region, idx) => {
          const selected = selectedId === region.id;
          const overview = locale === "en" ? region.overview_en : region.overview_pl;
          const stayHint = locale === "en" ? region.stay_hint_en : region.stay_hint_pl;
          const areaLabel = regionAreaLabel(region, locale);

          return (
            <div
              key={region.id}
              ref={(el) => {
                cardRefs.current[region.id] = el;
              }}
              className={cn(
                "rounded-2xl border transition-all",
                selected
                  ? "border-brand-700 bg-brand-50/40 ring-2 ring-brand-200"
                  : "border-border-default bg-white",
              )}
            >
              <div className="border-b border-border-default/60 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                      {t("regions.hintLabel")} #{idx + 1}
                      {areaLabel && (
                        <span className="ml-2 normal-case font-normal text-text-secondary">
                          · {areaLabel}
                        </span>
                      )}
                    </p>
                    <h3 className="font-display text-xl font-bold text-text-primary">
                      {regionDisplayName(region, locale)}
                    </h3>
                  </div>
                  {selected && (
                    <span className="rounded-full bg-brand-700 px-2.5 py-1 text-xs font-semibold text-white">
                      {t("regions.selected")}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-bg-soft px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                    {regionCharacterLabel(region.character, locale)}
                  </span>
                  <span className="rounded-full bg-bg-soft px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                    {regionVibeLabel(region.vibe, locale)}
                  </span>
                </div>
              </div>

              <div className="space-y-4 px-5 py-4">
                <p className="text-sm leading-relaxed text-text-primary">{overview}</p>
                <p className="rounded-lg border border-brand-100 bg-brand-50/50 px-3 py-2 text-sm text-text-secondary">
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

                <Button
                  variant={selected ? "secondary" : "primary"}
                  size="sm"
                  onClick={() => handleSelect(region)}
                >
                  {selected ? t("regions.useAsBase") : t("regions.selectHint")}
                </Button>
                <a
                  href={regionMapsSearchUrl(region, locale)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 text-xs font-semibold text-brand-700 hover:underline"
                >
                  {t("regions.viewOnMap")} →
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button size="lg" disabled={!selectedId} onClick={onContinue}>
          {t("regions.continue")}
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

"use client";

import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import {
  pickDisplayName,
  pickWhy,
  regionCharacterLabel,
  regionDisplayName,
  regionVibeLabel,
  type ScoredTouristRegion,
} from "@/lib/destinations/tourist-regions";
import { formatRhythmSummary, type TripRhythm } from "@/lib/search/trip-rhythm";
import { useLocale, useT } from "@/i18n/locale-provider";

export function TouristRegionCards({
  regions,
  rhythm,
  selectedId,
  onSelect,
  onContinue,
  onBack,
}: {
  regions: ScoredTouristRegion[];
  rhythm: TripRhythm;
  selectedId: string | null;
  onSelect: (region: ScoredTouristRegion) => void;
  onContinue: () => void;
  onBack?: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const planSummary = formatRhythmSummary(rhythm, locale);

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
      <div className="rounded-xl border border-brand-100 bg-brand-50/40 px-4 py-3 text-sm text-text-secondary">
        <span className="font-medium text-text-primary">{t("regions.planLabel")}</span>{" "}
        {planSummary}
      </div>

      <p className="text-sm text-text-secondary">{t("regions.intro")}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        {regions.map((region, idx) => {
          const selected = selectedId === region.id;
          const overview = locale === "en" ? region.overview_en : region.overview_pl;
          const stayHint = locale === "en" ? region.stay_hint_en : region.stay_hint_pl;

          return (
            <button
              key={region.id}
              type="button"
              onClick={() => onSelect(region)}
              className={cn(
                "rounded-2xl border text-left transition-all",
                selected
                  ? "border-brand-700 bg-brand-50/60 ring-2 ring-brand-200"
                  : "border-border-default bg-white hover:border-brand-300 hover:shadow-sm",
              )}
            >
              <div className="border-b border-border-default/60 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                      {t("regions.recommended")} #{idx + 1}
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
                <p className="text-sm text-text-secondary">{stayHint}</p>

                {region.picks_for_rhythm.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                      {t("regions.picksTitle")}
                    </p>
                    <ul className="space-y-2">
                      {region.picks_for_rhythm.map((pick) => (
                        <li
                          key={`${pick.day_theme}-${pick.name_pl}`}
                          className="rounded-lg border border-brand-100 bg-white/80 px-3 py-2"
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
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button size="lg" disabled={!selectedId} onClick={onContinue}>
          {t("regions.continue")}
        </Button>
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            {t("regions.adjustRhythm")}
          </Button>
        )}
      </div>
    </div>
  );
}

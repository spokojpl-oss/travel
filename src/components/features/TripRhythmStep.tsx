"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import {
  adjustableThemes,
  applyRhythmPreset,
  hasChildrenInPassengers,
  rhythmTotalDays,
  THEME_META,
  type TripDayTheme,
  type TripRhythm,
  type TripRhythmPreset,
} from "@/lib/search/trip-rhythm";
import { daysBetweenIso } from "@/lib/search/trip-context";
import { useT } from "@/i18n/locale-provider";

const PRESETS: Array<{
  id: TripRhythmPreset;
  titleKey: string;
  descKey: string;
}> = [
  { id: "beach_focus", titleKey: "rhythm.presetBeach", descKey: "rhythm.presetBeachDesc" },
  { id: "balanced", titleKey: "rhythm.presetBalanced", descKey: "rhythm.presetBalancedDesc" },
  {
    id: "culture_focus",
    titleKey: "rhythm.presetCulture",
    descKey: "rhythm.presetCultureDesc",
  },
  { id: "active", titleKey: "rhythm.presetActive", descKey: "rhythm.presetActiveDesc" },
];

const CYCLING_PRESETS: Array<{
  id: TripRhythmPreset;
  titleKey: string;
  descKey: string;
}> = [
  {
    id: "cycling_beach_mix",
    titleKey: "rhythm.presetCyclingBeachMix",
    descKey: "rhythm.presetCyclingBeachMixDesc",
  },
  {
    id: "cycling_only",
    titleKey: "rhythm.presetCyclingOnly",
    descKey: "rhythm.presetCyclingOnlyDesc",
  },
];

export function TripRhythmStep({
  departureDate,
  returnDate,
  passengers,
  rhythm,
  onChange,
  onContinue,
  continueLabel,
  isCycling = false,
}: {
  departureDate: string;
  returnDate: string | null;
  passengers?: string;
  rhythm: TripRhythm;
  onChange: (rhythm: TripRhythm) => void;
  onContinue: () => void;
  continueLabel?: string;
  isCycling?: boolean;
}) {
  const t = useT();
  const totalDays = daysBetweenIso(departureDate, returnDate ?? departureDate);
  const includeKids = hasChildrenInPassengers(passengers);
  const themes = adjustableThemes({ includeKids });
  const allocated = rhythmTotalDays(rhythm);
  const isComplete = allocated === totalDays;
  const presets = isCycling ? CYCLING_PRESETS : PRESETS;

  function applyPreset(preset: TripRhythmPreset) {
    onChange(applyRhythmPreset(preset, totalDays, { includeKids }));
  }

  function adjustTheme(theme: TripDayTheme, delta: number) {
    const nextCount = rhythm.days[theme] + delta;
    if (nextCount < 0) return;
    if (allocated + delta > totalDays) return;
    onChange({
      days: { ...rhythm.days, [theme]: nextCount },
      preset: null,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 font-display text-lg font-bold text-text-primary">
          {t("rhythm.presetsTitle")}
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={cn(
                "rounded-xl border p-3 text-left transition-all hover:border-brand-300",
                rhythm.preset === preset.id
                  ? "border-brand-700 bg-brand-50 ring-2 ring-brand-200"
                  : "border-border-default bg-white",
              )}
            >
              <p className="font-semibold text-text-primary">{t(preset.titleKey)}</p>
              <p className="mt-0.5 text-sm text-text-secondary">{t(preset.descKey)}</p>
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader
          title={t("rhythm.customTitle")}
          action={
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                isComplete
                  ? "bg-brand-700 text-white"
                  : "bg-amber-100 text-amber-900",
              )}
            >
              {t("rhythm.allocated", { allocated, total: totalDays })}
            </span>
          }
        />
        <CardBody className="space-y-2">
          <p className="text-sm text-text-secondary">{t("rhythm.customHint")}</p>
          {themes.map((theme) => {
            const meta = THEME_META[theme];
            const count = rhythm.days[theme];
            return (
              <div
                key={theme}
                className="flex items-center gap-2.5 rounded-lg border border-border-default bg-white px-2.5 py-2"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                  <Icon name={meta.icon} size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">{t(meta.labelKey)}</p>
                  <p className="text-xs text-text-tertiary">{t(meta.descKey)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label={t("rhythm.decrease")}
                    disabled={count <= 0}
                    onClick={() => adjustTheme(theme, -1)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border-default text-base font-bold text-text-primary hover:bg-bg-soft disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-7 text-center text-base font-bold tabular-nums text-text-primary">
                    {count}
                  </span>
                  <button
                    type="button"
                    aria-label={t("rhythm.increase")}
                    disabled={allocated >= totalDays}
                    onClick={() => adjustTheme(theme, 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border-default text-base font-bold text-text-primary hover:bg-bg-soft disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <Button size="lg" disabled={!isComplete} onClick={onContinue}>
        {continueLabel ?? t("rhythm.continue")}
      </Button>
    </div>
  );
}

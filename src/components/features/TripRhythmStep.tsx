"use client";

import { useMemo } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import {
  adjustableThemes,
  applyRhythmPreset,
  formatRhythmSummary,
  hasChildrenInPassengers,
  normalizeRhythm,
  rhythmTotalDays,
  THEME_META,
  type TripDayTheme,
  type TripRhythm,
  type TripRhythmPreset,
} from "@/lib/search/trip-rhythm";
import { daysBetweenIso } from "@/lib/search/trip-context";
import { useLocale, useT } from "@/i18n/locale-provider";

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

export function TripRhythmStep({
  departureDate,
  returnDate,
  passengers,
  rhythm,
  onChange,
  onContinue,
}: {
  departureDate: string;
  returnDate: string | null;
  passengers?: string;
  rhythm: TripRhythm;
  onChange: (rhythm: TripRhythm) => void;
  onContinue: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const totalDays = daysBetweenIso(departureDate, returnDate ?? departureDate);
  const includeKids = hasChildrenInPassengers(passengers);
  const themes = adjustableThemes({ includeKids });
  const allocated = rhythmTotalDays(rhythm);
  const isComplete = allocated === totalDays;

  const summary = useMemo(
    () => formatRhythmSummary(rhythm, locale),
    [rhythm, locale],
  );

  function applyPreset(preset: TripRhythmPreset) {
    onChange(applyRhythmPreset(preset, totalDays, { includeKids }));
  }

  function adjustTheme(theme: TripDayTheme, delta: number) {
    const nextDays = { ...rhythm.days, [theme]: rhythm.days[theme] + delta };
    if (nextDays[theme] < 0) return;
    onChange(
      normalizeRhythm({ days: nextDays, preset: null }, totalDays),
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-brand-100 bg-brand-50/30">
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-text-secondary">
              {t("rhythm.tripLength", { n: totalDays })}
            </p>
            <p className="mt-1 font-display text-lg font-bold text-text-primary">
              {summary || t("rhythm.emptyPlan")}
            </p>
          </div>
          <div
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold",
              isComplete
                ? "bg-brand-700 text-white"
                : "bg-amber-100 text-amber-900",
            )}
          >
            {t("rhythm.allocated", { allocated, total: totalDays })}
          </div>
        </CardBody>
      </Card>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold text-text-primary">
          {t("rhythm.presetsTitle")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={cn(
                "rounded-xl border p-4 text-left transition-all hover:border-brand-300",
                rhythm.preset === preset.id
                  ? "border-brand-700 bg-brand-50 ring-2 ring-brand-200"
                  : "border-border-default bg-white",
              )}
            >
              <p className="font-semibold text-text-primary">{t(preset.titleKey)}</p>
              <p className="mt-1 text-sm text-text-secondary">{t(preset.descKey)}</p>
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader title={t("rhythm.customTitle")} />
        <CardBody className="space-y-3">
          <p className="text-sm text-text-secondary">{t("rhythm.customHint")}</p>
          {themes.map((theme) => {
            const meta = THEME_META[theme];
            const count = rhythm.days[theme];
            return (
              <div
                key={theme}
                className="flex items-center gap-3 rounded-xl border border-border-default bg-white p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon name={meta.icon} size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text-primary">{t(meta.labelKey)}</p>
                  <p className="text-xs text-text-tertiary">{t(meta.descKey)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={t("rhythm.decrease")}
                    disabled={count <= 0}
                    onClick={() => adjustTheme(theme, -1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-default text-lg font-bold text-text-primary hover:bg-bg-soft disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-lg font-bold tabular-nums text-text-primary">
                    {count}
                  </span>
                  <button
                    type="button"
                    aria-label={t("rhythm.increase")}
                    disabled={allocated >= totalDays}
                    onClick={() => adjustTheme(theme, 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-default text-lg font-bold text-text-primary hover:bg-bg-soft disabled:opacity-40"
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
        {t("rhythm.continue")}
      </Button>
    </div>
  );
}

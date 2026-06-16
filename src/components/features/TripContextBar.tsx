"use client";

import { formatTripDateRange, travelModeIcon, type TripContext } from "@/lib/search/trip-context";
import { formatRhythmSummary } from "@/lib/search/trip-rhythm";
import { localeToIntl } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/locale-provider";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

export type DestinationSearchStep = 2 | 3 | 4 | 5 | 6 | 7;
export type ActivitiesSearchStep = 2 | 3;
export type SearchStep = DestinationSearchStep | ActivitiesSearchStep;

export function TripContextBar({
  trip,
  onEdit,
  compact,
}: {
  trip: TripContext;
  onEdit?: () => void;
  compact?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const intl = localeToIntl(locale);

  function formatOrigin(trip: TripContext): string {
    const origin = trip.origin_label ?? trip.origin_iata ?? "—";
    if (trip.travel_mode === "car" && trip.vehicle_source) {
      const vehicle =
        trip.vehicle_source === "own" ? t("context.ownCar") : t("context.rentalCar");
      return `${origin} (${vehicle} ${t("context.carWord")})`;
    }
    const modeLabel =
      {
        car: t("travel.car"),
        train: t("travel.train"),
        bus: t("travel.bus"),
        flight: t("travel.flight"),
      }[trip.travel_mode] ?? trip.travel_mode;
    return `${origin} (${modeLabel.toLowerCase()})`;
  }

  const items: Array<{ icon: IconName; label: string; value: string }> = [
    {
      icon: travelModeIcon(trip.travel_mode),
      label: t("context.travel"),
      value: formatOrigin(trip),
    },
    {
      icon: "calendar",
      label: t("context.when"),
      value: formatTripDateRange(trip, intl),
    },
    {
      icon: "users",
      label: t("context.who"),
      value: trip.passengers || "—",
    },
  ];

  if (trip.mode === "destination" && trip.destination_label) {
    items.unshift({
      icon: "map-pin",
      label: t("context.where"),
      value: trip.destination_label,
    });
  }

  if (trip.trip_rhythm && trip.mode === "destination") {
    items.push({
      icon: "route",
      label: t("context.rhythm"),
      value: formatRhythmSummary(trip.trip_rhythm, locale),
    });
  }

  if (trip.mode === "activities" && trip.interests) {
    items.unshift({
      icon: "target",
      label: t("context.interests"),
      value: trip.interests,
    });
  }

  return (
    <Card className={compact ? "mb-4" : "mb-6"}>
      <CardBody className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-start gap-2">
              <Icon
                name={item.icon}
                size={18}
                className="mt-0.5 shrink-0 text-brand-700"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  {item.label}
                </p>
                <p className="text-sm font-medium text-text-primary">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>
        {onEdit && (
          <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
            {t("context.edit")}
          </Button>
        )}
      </CardBody>
    </Card>
  );
}

export function SearchStepIndicator({
  step,
  onStep,
  tripComplete = false,
  tripMode = "activities",
}: {
  step: SearchStep;
  onStep?: (s: SearchStep) => void;
  tripComplete?: boolean;
  tripMode?: "activities" | "destination";
}) {
  const t = useT();

  const steps =
    tripMode === "destination"
      ? [
          { n: 1 as const, label: t("steps.trip"), key: "trip", goto: 2 as const },
          { n: 2 as const, label: t("steps.scope"), key: "scope", goto: 2 as const },
          { n: 3 as const, label: t("steps.overview"), key: "overview", goto: 3 as const },
          { n: 4 as const, label: t("steps.rhythm"), key: "rhythm", goto: 4 as const },
          { n: 5 as const, label: t("steps.regions"), key: "regions", goto: 5 as const },
          { n: 6 as const, label: t("steps.activities"), key: "activities", goto: 6 as const },
          { n: 7 as const, label: t("steps.results"), key: "results", goto: 7 as const },
        ]
      : [
          { n: 1 as const, label: t("steps.trip"), key: "trip", goto: 2 as const },
          { n: 2 as const, label: t("steps.activities"), key: "activities", goto: 2 as const },
          { n: 3 as const, label: t("steps.results"), key: "results", goto: 3 as const },
        ];

  const displayStep =
    tripMode === "destination"
      ? step
      : step >= 6
        ? 3
        : step;

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2">
      {steps.map((s, i) => {
        const stepNum = s.n;
        const done =
          displayStep > stepNum ||
          (tripComplete && stepNum === 1 && displayStep >= 2);
        const active = displayStep === stepNum;
        const clickable =
          onStep &&
          displayStep >= s.goto &&
          (tripMode === "destination"
            ? stepNum === 1
              ? tripComplete
              : displayStep >= stepNum
            : stepNum === 1
              ? tripComplete
              : displayStep >= stepNum);

        return (
          <div key={s.key} className="flex items-center gap-2">
            {i > 0 && (
              <span className="text-text-tertiary" aria-hidden>
                ›
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                if (!clickable || !onStep) return;
                if (stepNum === 1) onStep(2);
                else onStep(s.goto);
              }}
              disabled={!clickable}
              className={
                active
                  ? "rounded-full bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white"
                  : done
                    ? "rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100"
                    : "rounded-full bg-bg-soft px-4 py-1.5 text-sm font-medium text-text-tertiary"
              }
            >
              {stepNum}. {s.label}
            </button>
          </div>
        );
      })}
    </nav>
  );
}

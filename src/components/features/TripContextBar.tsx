"use client";

import { formatTripDateRange, travelModeIcon, type TripContext } from "@/lib/search/trip-context";
import { localeToIntl } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/locale-provider";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

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
  step: 2 | 3 | 4;
  onStep?: (s: 2 | 3 | 4) => void;
  tripComplete?: boolean;
  tripMode?: "activities" | "destination";
}) {
  const steps =
    tripMode === "destination"
      ? [
          { n: 1 as const, label: "Podróż", key: "trip" },
          { n: 2 as const, label: "Zakres", key: "scope" },
          { n: 3 as const, label: "Aktywności", key: "activities" },
          { n: 4 as const, label: "Wyniki", key: "results" },
        ]
      : [
          { n: 1 as const, label: "Podróż", key: "trip" },
          { n: 2 as const, label: "Aktywności", key: "activities" },
          { n: 3 as const, label: "Wyniki", key: "results" },
        ];

  const displayStep =
    tripMode === "destination"
      ? step
      : step >= 4
        ? 3
        : step;

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2">
      {steps.map((s, i) => {
        const stepNum = s.n;
        const done =
          displayStep > stepNum || (tripComplete && stepNum === 1 && displayStep >= 2);
        const active = displayStep === stepNum;
        const clickable =
          onStep &&
          (stepNum === 1
            ? tripComplete
            : stepNum === 2
              ? tripMode === "destination" && displayStep >= 2
              : stepNum === 3
                ? tripMode === "destination"
                  ? displayStep >= 3
                  : displayStep >= 2
                : false);

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
              else if (tripMode === "destination") onStep(stepNum as 2 | 3 | 4);
              else onStep(stepNum === 2 ? 2 : 3);
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

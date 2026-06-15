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
}: {
  step: 1 | 2 | 3;
  onStep?: (s: 1 | 2 | 3) => void;
  /** Krok „Podróż” ukończony na stronie głównej — tylko podgląd / edycja przez onStep(1) */
  tripComplete?: boolean;
}) {
  const steps = [
    { n: 1 as const, label: "Podróż" },
    { n: 2 as const, label: "Aktywności" },
    { n: 3 as const, label: "Wyniki" },
  ];

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2">
      {steps.map((s, i) => {
        const done = step > s.n || (tripComplete && s.n === 1 && step >= 2);
        const active = step === s.n;
        const clickable =
          onStep &&
          (s.n === 1
            ? tripComplete
            : s.n === 2
              ? step >= 2
              : false);

        return (
        <div key={s.n} className="flex items-center gap-2">
          {i > 0 && (
            <span className="text-text-tertiary" aria-hidden>
              ›
            </span>
          )}
          <button
            type="button"
            onClick={() => clickable && onStep?.(s.n)}
            disabled={!clickable}
            className={
              active
                ? "rounded-full bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white"
                : done
                  ? "rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100"
                  : "rounded-full bg-bg-soft px-4 py-1.5 text-sm font-medium text-text-tertiary"
            }
          >
            {s.n}. {s.label}
          </button>
        </div>
        );
      })}
    </nav>
  );
}

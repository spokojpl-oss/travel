"use client";

import { formatTripDateRange, travelModeIcon, type TripContext } from "@/lib/search/trip-context";
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
  searchStep,
}: {
  trip: TripContext;
  onEdit?: () => void;
  compact?: boolean;
  /** W trybie destination plan dni pokazujemy dopiero od kroku 4. */
  searchStep?: SearchStep;
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

  if (trip.activity === "cycling") {
    items.unshift({
      icon: "target",
      label: t("context.mode"),
      value: t("hero.tabCycling"),
    });
  } else if (trip.mode === "activities" && trip.interests) {
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
  skipRegionsStep = false,
  skipActivitiesStep = false,
  cyclingMode = false,
}: {
  step: SearchStep;
  onStep?: (s: SearchStep) => void;
  tripComplete?: boolean;
  tripMode?: "activities" | "destination";
  /** Ukryj krok „Region” gdy user wybrał całą wyspę. */
  skipRegionsStep?: boolean;
  /** Ukryj krok „Aktywności” w flow kolarstwa. */
  skipActivitiesStep?: boolean;
  /** Uproszczony stepper: tylko wyjazd + wyniki. */
  cyclingMode?: boolean;
}) {
  const t = useT();

  const steps = cyclingMode
    ? [
        { displayN: 1, label: t("steps.trip"), key: "trip", goto: 2 as SearchStep },
        { displayN: 2, label: t("steps.results"), key: "results", goto: 7 as SearchStep },
      ]
    : tripMode === "destination"
      ? [
          { displayN: 1, label: t("steps.trip"), key: "trip", goto: 2 as SearchStep },
          { displayN: 2, label: t("steps.scope"), key: "scope", goto: 2 as SearchStep },
          { displayN: 3, label: t("steps.overview"), key: "overview", goto: 3 as SearchStep },
          { displayN: 4, label: t("steps.rhythm"), key: "rhythm", goto: 4 as SearchStep },
          ...(skipRegionsStep
            ? []
            : [
                {
                  displayN: 5,
                  label: t("steps.regions"),
                  key: "regions",
                  goto: 5 as SearchStep,
                },
              ]),
          ...(skipActivitiesStep
            ? []
            : [
                {
                  displayN: skipRegionsStep ? 5 : 6,
                  label: t("steps.activities"),
                  key: "activities",
                  goto: 6 as SearchStep,
                },
              ]),
          {
            displayN: skipRegionsStep
              ? skipActivitiesStep
                ? 5
                : 6
              : skipActivitiesStep
                ? 6
                : 7,
            label: t("steps.results"),
            key: "results",
            goto: 7 as SearchStep,
          },
        ]
      : [
          { displayN: 1, label: t("steps.trip"), key: "trip", goto: 2 as SearchStep },
          { displayN: 2, label: t("steps.activities"), key: "activities", goto: 2 as SearchStep },
          { displayN: 3, label: t("steps.results"), key: "results", goto: 3 as SearchStep },
        ];

  const currentStep = cyclingMode
    ? step >= 7
      ? 7
      : 2
    : tripMode === "destination"
      ? step
      : step >= 6
        ? 3
        : step;

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2">
      {steps.map((s, i) => {
        const active = s.key === "trip" ? false : currentStep === s.goto;
        const done =
          s.key === "trip"
            ? currentStep >= 2 || tripComplete
            : currentStep > s.goto;
        const clickable =
          onStep &&
          (s.key === "trip"
            ? tripComplete
            : currentStep >= s.goto);

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
                if (s.key === "trip") onStep(2);
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
              {s.displayN}. {s.label}
            </button>
          </div>
        );
      })}
    </nav>
  );
}

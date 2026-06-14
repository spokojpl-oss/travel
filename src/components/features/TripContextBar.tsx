"use client";

import { formatTripDateRange, type TripContext } from "@/lib/search/trip-context";
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
  const items: Array<{ icon: IconName; label: string; value: string }> = [
    {
      icon: "plane",
      label: "Skąd",
      value: trip.origin_label ?? trip.origin_iata ?? "—",
    },
    {
      icon: "calendar",
      label: "Kiedy",
      value: formatTripDateRange(trip),
    },
    {
      icon: "users",
      label: "Kto",
      value: trip.passengers || "—",
    },
  ];

  if (trip.mode === "destination" && trip.destination_label) {
    items.unshift({
      icon: "map-pin",
      label: "Dokąd",
      value: trip.destination_label,
    });
  }

  if (trip.mode === "activities" && trip.interests) {
    items.unshift({
      icon: "target",
      label: "Zainteresowania",
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
            Zmień
          </Button>
        )}
      </CardBody>
    </Card>
  );
}

export function SearchStepIndicator({
  step,
  onStep,
}: {
  step: 1 | 2 | 3;
  onStep?: (s: 1 | 2 | 3) => void;
}) {
  const steps = [
    { n: 1 as const, label: "Podróż" },
    { n: 2 as const, label: "Aktywności" },
    { n: 3 as const, label: "Wyniki" },
  ];

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2">
          {i > 0 && (
            <span className="text-text-tertiary" aria-hidden>
              ›
            </span>
          )}
          <button
            type="button"
            onClick={() => onStep?.(s.n)}
            disabled={!onStep || s.n > step}
            className={
              step === s.n
                ? "rounded-full bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white"
                : step > s.n
                  ? "rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700"
                  : "rounded-full bg-bg-soft px-4 py-1.5 text-sm font-medium text-text-tertiary"
            }
          >
            {s.n}. {s.label}
          </button>
        </div>
      ))}
    </nav>
  );
}

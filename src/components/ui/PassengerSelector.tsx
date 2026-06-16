"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/locale-provider";
import {
  defaultPassengers,
  formatPassengers,
  parsePassengers,
  type PassengerBreakdown,
} from "@/lib/passengers/format";

export type { PassengerBreakdown };
export { defaultPassengers, formatPassengers, parsePassengers };

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-text-secondary">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default text-lg font-medium hover:bg-bg-soft disabled:opacity-40"
          aria-label={`Mniej: ${label}`}
        >
          −
        </button>
        <span className="w-6 text-center font-semibold text-text-primary">
          {value}
        </span>
        <button
          type="button"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default text-lg font-medium hover:bg-bg-soft disabled:opacity-40"
          aria-label={`Więcej: ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function PassengerSelector({
  value,
  onChange,
  large,
  className,
  hint,
}: {
  value: PassengerBreakdown;
  onChange: (v: PassengerBreakdown) => void;
  large?: boolean;
  className?: string;
  hint?: ReactNode;
}) {
  const t = useT();

  function setChildren(count: number) {
    const ages = [...value.childAges];
    while (ages.length < count) ages.push(8);
    onChange({ ...value, children: count, childAges: ages.slice(0, count) });
  }

  function setChildAge(index: number, age: number) {
    const ages = [...value.childAges];
    ages[index] = age;
    onChange({ ...value, childAges: ages });
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border-default p-3 transition-all hover:border-brand-300",
        large && "border-2 p-4",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
        <Icon name="users" size={14} />
        <span>{t("passengers.whoTravels")}</span>
      </div>

      {hint ? (
        <p className="mb-3 text-xs text-text-secondary">{hint}</p>
      ) : null}

      <div className="space-y-3">
        <Stepper
          label={t("passengers.adultsLabel")}
          value={value.adults}
          min={1}
          max={9}
          onChange={(adults) => onChange({ ...value, adults })}
        />
        <Stepper
          label={t("passengers.childrenLabel")}
          value={value.children}
          min={0}
          max={6}
          onChange={setChildren}
        />

        {value.children > 0 && (
          <div className="space-y-2 rounded-lg bg-bg-soft/80 p-3">
            <p className="text-xs font-medium text-text-secondary">
              Wiek dzieci (wpływa na ceny lotów i hoteli)
            </p>
            {Array.from({ length: value.children }, (_, i) => (
              <label
                key={i}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-text-secondary">Dziecko {i + 1}</span>
                <select
                  value={value.childAges[i] ?? 8}
                  onChange={(e) => setChildAge(i, Number(e.target.value))}
                  className="rounded-md border border-border-default bg-white px-2 py-1.5 text-sm"
                >
                  {Array.from({ length: 18 }, (_, age) => (
                    <option key={age} value={age}>
                      {age === 0 ? "niemowlę (<1)" : `${age} lat`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}

        <p className="text-xs text-text-tertiary">
          Podsumowanie: {formatPassengers(value)}
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/Icon";

const WEEKDAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const MONTHS = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value + "T12:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function DatePicker({
  label,
  value,
  onChange,
  min,
  large,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  large?: boolean;
  className?: string;
}) {
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(parseDate(value) ?? new Date()),
  );
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  const selected = parseDate(value);
  const minDate = parseDate(min ?? null) ?? new Date();

  useEffect(() => {
    if (open) {
      setViewMonth(startOfMonth(selected ?? new Date()));
    }
  }, [open, value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    function updatePosition() {
      const rect = buttonRef.current!.getBoundingClientRect();
      const panelWidth = Math.max(rect.width, 320);
      const spaceBelow = window.innerHeight - rect.bottom - 16;
      const openUp = spaceBelow < 360;

      setPanelStyle({
        position: "fixed",
        left: Math.min(rect.left, window.innerWidth - panelWidth - 16),
        width: panelWidth,
        zIndex: 9999,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + 8 }
          : { top: rect.bottom + 8 }),
      });
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  const displayValue = selected
    ? selected.toLocaleDateString("pl-PL", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Wybierz datę";

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startPad = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<Date | null> = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }

  const panel = open ? (
    <div
      ref={panelRef}
      id={panelId}
      style={panelStyle}
      className="rounded-2xl border border-border-default bg-white p-4 shadow-2xl"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          ←
        </button>
        <span className="font-display text-lg font-bold text-text-primary">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          →
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-text-tertiary">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const dayStart = new Date(
            day.getFullYear(),
            day.getMonth(),
            day.getDate(),
          );
          const minStart = new Date(
            minDate.getFullYear(),
            minDate.getMonth(),
            minDate.getDate(),
          );
          const disabled = dayStart < minStart;
          const active = selected && isSameDay(day, selected);
          return (
            <button
              key={toIsoDate(day)}
              type="button"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(toIsoDate(day));
                setOpen(false);
              }}
              className={cn(
                "flex h-11 w-full items-center justify-center rounded-lg text-base font-medium transition-colors",
                disabled && "cursor-not-allowed text-text-tertiary/40",
                !disabled && !active && "text-text-primary hover:bg-brand-50",
                active && "bg-brand-700 text-white hover:bg-brand-800",
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "rounded-xl border border-border-default p-3 transition-all hover:border-brand-300 focus-within:border-brand-700 focus-within:ring-2 focus-within:ring-brand-100",
          large && "border-2 p-4 focus-within:ring-4",
        )}
      >
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          <Icon name="calendar" size={14} />
          <span>{label}</span>
        </div>
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex w-full items-center justify-between text-left font-medium text-text-primary",
            large ? "text-lg font-semibold" : "text-base",
            !value && "text-text-tertiary",
          )}
        >
          <span>{displayValue}</span>
          <Icon
            name="chevron-right"
            size={16}
            className="rotate-90 text-text-tertiary"
          />
        </button>
      </div>

      {typeof document !== "undefined" &&
        panel &&
        createPortal(panel, document.body)}
    </div>
  );
}

export function DateRangePicker({
  labelFrom,
  labelTo,
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  min,
  className,
}: {
  labelFrom?: string;
  labelTo?: string;
  fromValue: string;
  toValue: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  min?: string;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <DatePicker
        label={labelFrom ?? "Wyjazd"}
        value={fromValue}
        onChange={(v) => {
          onFromChange(v);
          if (toValue && v > toValue) onToChange(v);
        }}
        min={min}
      />
      <DatePicker
        label={labelTo ?? "Powrót"}
        value={toValue}
        onChange={onToChange}
        min={fromValue || min}
      />
    </div>
  );
}

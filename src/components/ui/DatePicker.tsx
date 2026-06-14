"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/Icon";
import { agentLog } from "@/lib/debug/agent-log";

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

function formatDisplay(value: string): string {
  const selected = parseDate(value);
  if (!selected) return "Wybierz datę";
  return selected.toLocaleDateString("pl-PL", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Pojedynczy kalendarz — używaj tylko gdy potrzebna jedna data */
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
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  const panel =
    open && triggerRef.current ? (
      <CalendarPanel
        panelRef={panelRef}
        triggerRef={triggerRef}
        value={value}
        min={min}
        onSelect={(v) => {
          onChange(v);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
        headerHint={label}
      />
    ) : null;

  return (
    <>
      <DateFieldButton
        label={label}
        value={value}
        display={formatDisplay(value)}
        large={large}
        className={className}
        open={open}
        triggerRef={triggerRef}
        onToggle={() => setOpen((o) => !o)}
      />
      {typeof document !== "undefined" &&
        panel &&
        createPortal(panel, document.body)}
    </>
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
  const [activeField, setActiveField] = useState<"from" | "to" | null>(null);
  const fromRef = useRef<HTMLButtonElement>(null);
  const toRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const triggerRef = activeField === "to" ? toRef : fromRef;
  const activeValue = activeField === "to" ? toValue : fromValue;
  const activeMin = activeField === "to" ? fromValue || min : min;

  useEffect(() => {
    if (!activeField) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        fromRef.current?.contains(target) ||
        toRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setActiveField(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeField]);

  function handleDaySelect(iso: string) {
    // #region agent log
    agentLog(
      "DateRangePicker:select",
      "day selected",
      { activeField, iso, fromValue, toValue },
      "CAL",
    );
    // #endregion

    if (activeField === "from") {
      onFromChange(iso);
    } else if (activeField === "to") {
      onToChange(iso);
    }
    setActiveField(null);
  }

  const panel =
    activeField && triggerRef.current ? (
      <CalendarPanel
        panelRef={panelRef}
        triggerRef={triggerRef}
        value={activeValue}
        min={activeMin}
        onSelect={handleDaySelect}
        onClose={() => setActiveField(null)}
        headerHint={activeField === "from" ? labelFrom ?? "Wyjazd" : labelTo ?? "Powrót"}
      />
    ) : null;

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <DateFieldButton
        label={labelFrom ?? "Wyjazd"}
        value={fromValue}
        display={formatDisplay(fromValue)}
        open={activeField === "from"}
        triggerRef={fromRef}
        onToggle={() =>
          setActiveField((f) => (f === "from" ? null : "from"))
        }
      />
      <DateFieldButton
        label={labelTo ?? "Powrót"}
        value={toValue}
        display={formatDisplay(toValue)}
        open={activeField === "to"}
        triggerRef={toRef}
        onToggle={() => setActiveField((f) => (f === "to" ? null : "to"))}
      />
      {typeof document !== "undefined" &&
        panel &&
        createPortal(panel, document.body)}
    </div>
  );
}

function DateFieldButton({
  label,
  value,
  display,
  large,
  className,
  open,
  triggerRef,
  onToggle,
}: {
  label: string;
  value: string;
  display: string;
  large?: boolean;
  className?: string;
  open: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onToggle: () => void;
}) {
  const panelId = useId();

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "rounded-xl border border-border-default p-3 transition-all hover:border-brand-300",
          open && "border-brand-700 ring-2 ring-brand-100",
          large && "border-2 p-4",
          open && large && "ring-4",
        )}
      >
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          <Icon name="calendar" size={14} />
          <span>{label}</span>
        </div>
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className={cn(
            "flex w-full items-center justify-between text-left font-medium text-text-primary",
            large ? "text-lg font-semibold" : "text-base",
            !value && "text-text-tertiary",
          )}
        >
          <span>{display}</span>
          <Icon
            name="chevron-right"
            size={16}
            className="rotate-90 text-text-tertiary"
          />
        </button>
      </div>
    </div>
  );
}

function CalendarPanel({
  panelRef,
  triggerRef,
  value,
  min,
  onSelect,
  onClose,
  headerHint,
}: {
  panelRef: React.RefObject<HTMLDivElement | null>;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  value: string;
  min?: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
  headerHint?: string;
}) {
  const panelId = useId();
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(parseDate(value) ?? new Date()),
  );
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  const selected = parseDate(value);
  const minDate = parseDate(min ?? null) ?? new Date();

  useEffect(() => {
    setViewMonth(startOfMonth(selected ?? new Date()));
  }, [value]);

  useEffect(() => {
    if (!triggerRef.current) return;

    function updatePosition() {
      const rect = triggerRef.current!.getBoundingClientRect();
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
  }, [triggerRef]);

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

  return (
    <div
      ref={panelRef}
      id={panelId}
      style={panelStyle}
      className="rounded-2xl border border-border-default bg-white p-4 shadow-2xl"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {headerHint && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
          Wybierasz: {headerHint}
        </p>
      )}
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
              onClick={() => onSelect(toIsoDate(day))}
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
      <button
        type="button"
        onClick={onClose}
        className="mt-3 w-full text-center text-xs text-text-tertiary hover:text-text-secondary"
      >
        Zamknij
      </button>
    </div>
  );
}

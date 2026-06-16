"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DateRangePicker } from "@/components/ui/DatePicker";
import { useLocale, useT } from "@/i18n/locale-provider";
import { parseIsoDateLocal } from "@/lib/search/trip-context";

function formatDateRangeLabel(
  departureDate: string,
  returnDate: string | null,
  intlLocale: string,
): string {
  const from =
    parseIsoDateLocal(departureDate)?.toLocaleDateString(intlLocale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) ?? departureDate;
  if (!returnDate || returnDate === departureDate) return from;
  const to =
    parseIsoDateLocal(returnDate)?.toLocaleDateString(intlLocale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) ?? returnDate;
  return `${from} – ${to}`;
}

export function OverviewInlineDateChange({
  departureDate,
  returnDate,
  onDatesChange,
}: {
  departureDate: string;
  returnDate: string | null;
  onDatesChange: (departure: string, returnDate: string | null) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const intlLocale = locale === "en" ? "en-GB" : "pl-PL";
  const [open, setOpen] = useState(false);
  const minDate = new Date().toISOString().split("T")[0]!;

  const currentLabel = formatDateRangeLabel(
    departureDate,
    returnDate,
    intlLocale,
  );

  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-4">
      <p className="text-sm font-medium text-text-primary">
        {t("search.overviewDateChangePrompt")}
      </p>
      <p className="mt-1 text-xs text-text-secondary">
        {t("search.overviewDateCurrent")}:{" "}
        <strong className="text-text-primary">{currentLabel}</strong>
      </p>

      {!open ? (
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => setOpen(true)}
        >
          {t("search.overviewDateChangeAction")}
        </Button>
      ) : (
        <div className="mt-4 space-y-3">
          <DateRangePicker
            labelFrom={t("form.departure")}
            labelTo={t("form.return")}
            fromValue={departureDate}
            toValue={returnDate ?? ""}
            onFromChange={(from, suggestedTo) => {
              onDatesChange(from, suggestedTo ?? returnDate);
            }}
            onToChange={(to) => {
              onDatesChange(departureDate, to || null);
            }}
            min={minDate}
          />
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            {t("search.overviewDateChangeDone")}
          </Button>
        </div>
      )}
    </div>
  );
}

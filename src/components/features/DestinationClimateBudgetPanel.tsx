"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import type { DestinationProfileResponse } from "@/lib/destinations/destination-profile";
import { useT } from "@/i18n/locale-provider";

const RATING_COLORS: Record<string, string> = {
  ideal: "bg-emerald-500",
  good: "bg-lime-400",
  fair: "bg-amber-400",
  poor: "bg-orange-400",
  very_poor: "bg-red-400",
};

function formatPln(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${Math.round(value)} zł`;
}

export function DestinationClimateBudgetPanel({
  destinationLabel,
  lat,
  lon,
}: {
  destinationLabel: string;
  lat?: number | null;
  lon?: number | null;
}) {
  const t = useT();
  const [profile, setProfile] = useState<DestinationProfileResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ label: destinationLabel });
    if (lat != null && lon != null) {
      params.set("lat", String(lat));
      params.set("lon", String(lon));
    }

    fetch(`/api/search/destination-profile?${params}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
        return data as { profile: DestinationProfileResponse };
      })
      .then((data) => {
        if (cancelled) return;
        setProfile(data.profile);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [destinationLabel, lat, lon]);

  if (loading) {
    return (
      <Card className="mb-6 border-brand-100">
        <CardHeader title={t("search.climateYearTitle")} />
        <CardBody className="text-sm text-text-secondary">
          {t("search.climateLoading")}
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-6 border-danger/30 bg-orange-50/50">
        <CardBody className="text-sm text-text-secondary">{error}</CardBody>
      </Card>
    );
  }

  if (!profile?.climate && !profile?.budget) {
    return null;
  }

  const { climate, budget } = profile;

  return (
    <div className="mb-6 space-y-6">
      {climate && climate.monthly.length > 0 && (
        <Card className="border-brand-100">
          <CardHeader title={t("search.climateYearTitle")} />
          <CardBody className="space-y-4 text-sm">
            {climate.best_months.length > 0 && (
              <p className="text-text-secondary">
                {t("search.climateBestMonths")}:{" "}
                <strong className="text-text-primary">
                  {climate.best_months.map((m) => m.name).join(", ")}
                </strong>
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border-default text-text-tertiary">
                    <th className="py-2 pr-2 font-medium">
                      {t("search.climateMonth")}
                    </th>
                    <th className="py-2 px-2 font-medium">
                      {t("search.climateTemp")}
                    </th>
                    <th className="py-2 px-2 font-medium">
                      {t("search.climateRain")}
                    </th>
                    <th className="py-2 pl-2 font-medium">
                      {t("search.climateRating")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {climate.monthly.map((row) => (
                    <tr
                      key={row.month}
                      className="border-b border-border-default/60"
                    >
                      <td className="py-2 pr-2 font-medium text-text-primary">
                        {row.month_name}
                      </td>
                      <td className="py-2 px-2 text-text-secondary">
                        {row.temp_min_avg}–{row.temp_max_avg}°C
                      </td>
                      <td className="py-2 px-2 text-text-secondary">
                        ~{row.rainy_days_avg}{" "}
                        {t("search.climateRainyDaysShort")}
                      </td>
                      <td className="py-2 pl-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`inline-block h-2.5 w-2.5 rounded-full ${RATING_COLORS[row.climate_rating] ?? "bg-gray-300"}`}
                          />
                          <span className="text-text-secondary">
                            {row.rating_label}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {budget && (
        <Card>
          <CardHeader title={t("search.budgetTitle")} />
          <CardBody className="space-y-4 text-sm">
            {budget.cpi_vs_reference_pct != null && (
              <p className="text-text-secondary">
                {t("search.budgetVsPoland")}:{" "}
                <strong className="text-text-primary">
                  {budget.cpi_vs_reference_pct > 0 ? "+" : ""}
                  {budget.cpi_vs_reference_pct}%
                </strong>
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <BudgetTier
                label={t("search.budgetLow")}
                value={budget.daily_budget_low}
              />
              <BudgetTier
                label={t("search.budgetMid")}
                value={budget.daily_budget_mid}
                highlight
              />
              <BudgetTier
                label={t("search.budgetHigh")}
                value={budget.daily_budget_high}
              />
            </div>

            <p className="text-xs text-text-tertiary">
              {t("search.budgetHint")} · {budget.source}
              {profile.budget_source === "live" ? ` (${t("search.budgetLive")})` : ""}
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function BudgetTier({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number | null;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight
          ? "border-brand-200 bg-brand-50/50"
          : "border-border-default bg-bg-soft"
      }`}
    >
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className="font-display text-lg font-bold text-text-primary">
        {formatPln(value)}
        <span className="text-xs font-normal text-text-secondary">
          {" "}
          / os. / dzień
        </span>
      </p>
    </div>
  );
}

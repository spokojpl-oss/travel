"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { useLocale } from "@/i18n/locale-provider";

export function SearchScopeParamsPanel({
  matchMode,
  onMatchModeChange,
  maxRadius,
  onMaxRadiusChange,
  minPerActivity,
  onMinPerActivityChange,
}: {
  matchMode: "all" | "any";
  onMatchModeChange: (mode: "all" | "any") => void;
  maxRadius: number;
  onMaxRadiusChange: (km: number) => void;
  minPerActivity: number;
  onMinPerActivityChange: (n: number) => void;
}) {
  const { locale } = useLocale();
  const pl = locale !== "en";

  return (
    <Card className="mb-6 border-brand-200 bg-gradient-to-br from-brand-50/80 to-white shadow-sm">
      <CardHeader
        title={pl ? "Jak daleko szukamy?" : "How far should we search?"}
      />
      <CardBody className="space-y-5 text-sm">
        <p className="leading-relaxed text-text-secondary">
          {pl
            ? "Ustaw promień jednego rejonu na mapie i to, ile miejsc musi pasować do wybranych aktywności. Reszta wyszukiwania korzysta z tych wartości."
            : "Set the map cluster radius and how many places must match your selected activities."}
        </p>

        <div>
          <p className="mb-2 font-semibold text-text-primary">
            {pl ? "Tryb dopasowania aktywności" : "Activity match mode"}
          </p>
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                checked={matchMode === "all"}
                onChange={() => onMatchModeChange("all")}
                className="accent-brand-700"
              />
              <span>{pl ? "Wszystkie wybrane" : "All selected"}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                checked={matchMode === "any"}
                onChange={() => onMatchModeChange("any")}
                className="accent-brand-700"
              />
              <span>{pl ? "Dowolna z wybranych" : "Any selected"}</span>
            </label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="font-semibold text-text-primary">
              {pl ? "Promień jednego rejonu (km)" : "Single-area radius (km)"}
            </span>
            <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
              {pl
                ? "Atrakcje w jednym klastrze na mapie — np. 10–15 km na jeden dzień bez jazdy po całej wyspie."
                : "Attractions in one map cluster — e.g. 10–15 km for a day without crossing the island."}
            </p>
            <input
              type="range"
              min={3}
              max={80}
              value={maxRadius}
              onChange={(e) => onMaxRadiusChange(Number(e.target.value))}
              className="mt-2 w-full accent-brand-700"
            />
            <input
              type="number"
              min={3}
              max={80}
              value={maxRadius}
              onChange={(e) =>
                onMaxRadiusChange(
                  Math.min(80, Math.max(3, Number(e.target.value) || 15)),
                )
              }
              className="mt-2 w-full rounded-md border border-border-default px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="block">
            <span className="font-semibold text-text-primary">
              {pl ? "Min. atrakcji / aktywność" : "Min. attractions / activity"}
            </span>
            <p className="mt-0.5 text-xs text-text-secondary">
              {pl
                ? "Region musi mieć co najmniej tyle miejsc na każdą wybraną aktywność."
                : "A region must have at least this many places per selected activity."}
            </p>
            <input
              type="number"
              min={1}
              max={10}
              value={minPerActivity}
              onChange={(e) =>
                onMinPerActivityChange(
                  Math.min(10, Math.max(1, Number(e.target.value) || 1)),
                )
              }
              className="mt-2 w-full rounded-md border border-border-default px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>
      </CardBody>
    </Card>
  );
}

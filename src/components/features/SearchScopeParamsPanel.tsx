"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import {
  EXPLORATION_SCOPE_OPTIONS,
  scopeSearchRadii,
  type ExplorationScope,
} from "@/lib/search/exploration-scope";
import { useLocale } from "@/i18n/locale-provider";

export function SearchScopeParamsPanel({
  explorationScope,
  onScopeChange,
  matchMode,
  onMatchModeChange,
  maxRadius,
  onMaxRadiusChange,
  minPerActivity,
  onMinPerActivityChange,
  showScope = true,
}: {
  explorationScope: ExplorationScope;
  onScopeChange: (scope: ExplorationScope) => void;
  matchMode: "all" | "any";
  onMatchModeChange: (mode: "all" | "any") => void;
  maxRadius: number;
  onMaxRadiusChange: (km: number) => void;
  minPerActivity: number;
  onMinPerActivityChange: (n: number) => void;
  showScope?: boolean;
}) {
  const { locale } = useLocale();
  const pl = locale !== "en";
  const exploreKm = scopeSearchRadii(explorationScope).explore_radius_km;

  return (
    <Card className="mb-6 border-brand-200 bg-gradient-to-br from-brand-50/80 to-white shadow-sm">
      <CardHeader
        title={pl ? "Jak daleko szukamy?" : "How far should we search?"}
      />
      <CardBody className="space-y-5 text-sm">
        <p className="leading-relaxed text-text-secondary">
          {pl
            ? "To ustawienie decyduje, czy chcesz atrakcje blisko siebie (jeden rejon, krótkie dojazdy) czy szerzej po wyspie / kraju. Wpływa na wyniki wyszukiwania poniżej."
            : "This controls whether you want attractions close together (one area, short drives) or spread across the island / country. It affects search results below."}
        </p>

        {showScope && (
          <div>
            <p className="mb-2 font-semibold text-text-primary">
              {pl ? "Zasięg podróży" : "Travel range"}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {EXPLORATION_SCOPE_OPTIONS.map((opt) => {
                const active = explorationScope === opt.value;
                const radii = scopeSearchRadii(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onScopeChange(opt.value)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      active
                        ? "border-brand-700 bg-white ring-2 ring-brand-200"
                        : "border-border-default bg-white/80 hover:border-brand-300",
                    )}
                  >
                    <p className="font-semibold text-text-primary">
                      {pl ? opt.label_pl : opt.label_en}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                      {pl ? opt.description_pl : opt.description_en}
                    </p>
                    <p className="mt-1.5 text-[11px] font-medium text-brand-700">
                      {pl
                        ? `Szukamy do ${radii.explore_radius_km} km · rejon ~${radii.stay_radius_km} km`
                        : `Search up to ${radii.explore_radius_km} km · area ~${radii.stay_radius_km} km`}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-brand-100 bg-white/90 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            {pl ? "Aktywne promienie" : "Active radii"}
          </p>
          <p className="mt-1 text-sm text-text-primary">
            {pl ? (
              <>
                Pobieramy atrakcje w promieniu{" "}
                <strong>{exploreKm} km</strong> · grupujemy w rejonach po{" "}
                <strong>{maxRadius} km</strong>
              </>
            ) : (
              <>
                Fetching attractions within <strong>{exploreKm} km</strong> ·
                clustering areas at <strong>{maxRadius} km</strong>
              </>
            )}
          </p>
        </div>

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

"use client";

import { useMemo } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import type { ExplorationScope } from "@/lib/search/exploration-scope";
import {
  adviseExplorationScope,
  type ScopeAdvice,
} from "@/lib/search/scope-advisor";
import { useLocale, useT } from "@/i18n/locale-provider";

export function ExplorationScopeStep({
  destinationLabel,
  departureDate,
  returnDate,
  passengers,
  destinationLat,
  destinationLon,
  selectedScope,
  onSelectScope,
  onContinue,
  isCycling = false,
}: {
  destinationLabel: string;
  departureDate: string;
  returnDate: string | null;
  passengers?: string;
  destinationLat?: number | null;
  destinationLon?: number | null;
  selectedScope: ExplorationScope;
  onSelectScope: (scope: ExplorationScope) => void;
  onContinue: () => void;
  isCycling?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();

  const advice: ScopeAdvice = useMemo(
    () =>
      adviseExplorationScope({
        destinationLabel,
        departureDate,
        returnDate,
        passengers,
        locale,
        destinationLat,
        destinationLon,
        isCycling,
      }),
    [
      destinationLabel,
      departureDate,
      returnDate,
      passengers,
      locale,
      destinationLat,
      destinationLon,
      isCycling,
    ],
  );

  return (
    <div className="space-y-6">
      <Card className="border-brand-100 bg-brand-50/30">
        <CardBody className="space-y-2">
          <p className="font-display text-lg font-bold text-text-primary">
            {advice.headline}
          </p>
          <p className="text-sm leading-relaxed text-text-secondary">
            {advice.summary}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("search.scopeTitle")} />
        <CardBody className="space-y-3">
          {advice.options.map((option) => {
            const active = selectedScope === option.value;
            const recommended = advice.recommended === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelectScope(option.value)}
                className={cn(
                  "w-full rounded-xl border p-4 text-left transition-colors",
                  active
                    ? "border-brand-700 bg-brand-50 ring-2 ring-brand-200"
                    : "border-border-default hover:border-brand-300",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-text-primary">
                    {option.label}
                  </p>
                  {recommended && (
                    <span className="rounded-full bg-brand-700 px-2 py-0.5 text-xs font-semibold text-white">
                      {t("scope.recommended")}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-text-secondary">
                  {option.description}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-text-tertiary">
                  {option.rationale}
                </p>
              </button>
            );
          })}
        </CardBody>
      </Card>

      <Button size="lg" onClick={onContinue}>
        {t("search.continueToOverview")}
      </Button>
    </div>
  );
}

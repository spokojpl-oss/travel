"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RegionMap } from "@/components/features/RegionMap";
import { cn } from "@/lib/utils/cn";
import { buildIslandMapData } from "@/lib/maps/build-island-map";
import { toPolishAttractionName } from "@/lib/plan/attraction-display-name";
import type { IslandFeasibilityAdvice } from "@/lib/search/island-feasibility";
import type { ActivitySearchResult, AttractionWithActivities } from "@/types/domain";
import { useLocale, useT } from "@/i18n/locale-provider";

type TaxonomyActivity = { slug: string; name_pl: string; name_en: string };

export function IslandOverviewSection({
  results,
  activityNames,
  taxonomyActivities,
  feasibility,
  onNarrowScope,
  onExtendTrip,
  onPlanTrip,
}: {
  results: ActivitySearchResult;
  activityNames: Record<string, string>;
  taxonomyActivities: TaxonomyActivity[];
  feasibility: IslandFeasibilityAdvice | null;
  onNarrowScope?: () => void;
  onExtendTrip?: () => void;
  onPlanTrip?: (selectedIds: string[], pool: AttractionWithActivities[]) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const overview = results.island_overview!;

  const slugsOnIsland = useMemo(
    () => Object.keys(overview.activity_counts).sort((a, b) => overview.activity_counts[b] - overview.activity_counts[a]),
    [overview.activity_counts],
  );

  const [enabledSlugs, setEnabledSlugs] = useState<Set<string>>(
    () => new Set(slugsOnIsland),
  );
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [planIds, setPlanIds] = useState<Set<string>>(new Set());

  const filteredAttractions = useMemo(() => {
    if (enabledSlugs.size === 0) return [];
    return overview.attractions.filter((a) =>
      a.activity_tags.some((tag) => enabledSlugs.has(tag.activity_slug)),
    );
  }, [overview.attractions, enabledSlugs]);

  const mapData = useMemo(
    () =>
      buildIslandMapData({
        attractions: filteredAttractions,
        airports: overview.airports,
      }),
    [filteredAttractions, overview.airports],
  );

  const selectedAttraction = useMemo(
    () => overview.attractions.find((a) => a.id === selectedPointId) ?? null,
    [overview.attractions, selectedPointId],
  );

  function toggleSlug(slug: string) {
    setEnabledSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function togglePlan(id: string) {
    setPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const feasibilityBorder =
    feasibility?.level === "too_short"
      ? "border-amber-300 bg-amber-50/80"
      : feasibility?.level === "tight"
        ? "border-orange-200 bg-orange-50/60"
        : "border-brand-100 bg-brand-50/30";

  return (
    <>
      <h2 className="font-display mb-2 text-xl font-bold text-text-primary">
        {t("island.title", { name: overview.island_name })}
      </h2>
      <p className="mb-6 text-sm text-text-secondary">
        {t("island.subtitle", {
          count: results.total_attractions_considered,
          filtered: filteredAttractions.length,
          selected: planIds.size,
        })}
      </p>

      {feasibility && (
        <Card className={cn("mb-6", feasibilityBorder)}>
          <CardBody className="space-y-3">
            <p className="font-semibold text-text-primary">{feasibility.title}</p>
            <p className="text-sm text-text-secondary">{feasibility.body}</p>
            {feasibility.weatherHint && (
              <p className="text-sm text-text-secondary">{feasibility.weatherHint}</p>
            )}
            {feasibility.alternatives.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {onExtendTrip && (
                  <Button variant="secondary" size="sm" onClick={onExtendTrip}>
                    {feasibility.alternatives.find((a) => a.action === "extend")
                      ?.label ?? t("island.extendTrip")}
                  </Button>
                )}
                {onNarrowScope && (
                  <Button variant="ghost" size="sm" onClick={onNarrowScope}>
                    {feasibility.alternatives.find((a) => a.action === "narrow_scope")
                      ?.label ?? t("island.narrowScope")}
                  </Button>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <Card className="mb-6 overflow-hidden">
        <RegionMap
          points={mapData.points}
          segments={[]}
          height={520}
          showRouteList={false}
          highlightedPointId={selectedPointId}
          onPointClick={(point) => {
            if (point.type === "attraction") setSelectedPointId(point.id);
          }}
        />
        <CardBody className="text-sm text-text-secondary">
          <p>{t("island.mapHint")}</p>
          {results.total_attractions_considered > overview.attractions.length && (
            <p className="mt-1 text-xs text-text-tertiary">
              {t("island.mapCap", {
                shown: overview.attractions.length,
                total: results.total_attractions_considered,
              })}
            </p>
          )}
        </CardBody>
      </Card>

      {selectedAttraction && (
        <Card className="mb-6 border-brand-200">
          <CardBody className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-text-primary">
                {toPolishAttractionName(selectedAttraction.name, locale)}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {selectedAttraction.activity_tags
                  .map((tag) => activityNames[tag.activity_slug] ?? tag.activity_slug)
                  .join(" · ")}
              </p>
            </div>
            <Button
              variant={planIds.has(selectedAttraction.id) ? "secondary" : "primary"}
              size="sm"
              onClick={() => togglePlan(selectedAttraction.id)}
            >
              {planIds.has(selectedAttraction.id)
                ? t("island.removeFromPlan")
                : t("island.addToPlan")}
            </Button>
          </CardBody>
        </Card>
      )}

      <Card className="mb-8">
        <CardHeader
          title={t("island.filtersTitle")}
          action={
            <div className="flex gap-2">
              <button
                type="button"
                className="text-xs font-medium text-brand-700 hover:underline"
                onClick={() => setEnabledSlugs(new Set(slugsOnIsland))}
              >
                {t("island.showAll")}
              </button>
              <button
                type="button"
                className="text-xs font-medium text-text-tertiary hover:underline"
                onClick={() => setEnabledSlugs(new Set())}
              >
                {t("island.hideAll")}
              </button>
            </div>
          }
        />
        <CardBody>
          <div className="flex flex-wrap gap-2">
            {slugsOnIsland.map((slug) => {
              const active = enabledSlugs.has(slug);
              const count = overview.activity_counts[slug] ?? 0;
              const label =
                taxonomyActivities.find((a) => a.slug === slug)?.[
                  locale === "en" ? "name_en" : "name_pl"
                ] ?? activityNames[slug] ?? slug;
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => toggleSlug(slug)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-brand-700 text-white"
                      : "bg-bg-soft text-text-tertiary line-through",
                  )}
                >
                  {label}: {count}
                </button>
              );
            })}
          </div>
          {enabledSlugs.size === 0 && (
            <p className="mt-3 text-sm text-amber-800">{t("island.noFilters")}</p>
          )}
          {planIds.size > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-text-secondary">
                {t("island.planSelected", { n: planIds.size })}
              </p>
              {onPlanTrip && (
                <Button
                  size="lg"
                  onClick={() =>
                    onPlanTrip([...planIds], filteredAttractions)
                  }
                >
                  {locale === "en"
                    ? "Plan trip with selected places →"
                    : "Zaplanuj wyjazd z wybranymi miejscami →"}
                </Button>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}

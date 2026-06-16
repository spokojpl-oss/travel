"use client";

import { useEffect, useMemo, useState } from "react";
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

function activityLabel(
  slug: string,
  activityNames: Record<string, string>,
  taxonomyActivities: TaxonomyActivity[],
  locale: "pl" | "en",
): string {
  return (
    taxonomyActivities.find((a) => a.slug === slug)?.[
      locale === "en" ? "name_en" : "name_pl"
    ] ??
    activityNames[slug] ??
    slug
  );
}

function attractionSummary(
  attraction: AttractionWithActivities,
  activityNames: Record<string, string>,
  taxonomyActivities: TaxonomyActivity[],
  locale: "pl" | "en",
): string {
  const description = attraction.description?.trim();
  if (description && description.length >= 12) return description;

  const tags = attraction.activity_tags
    .map((tag) => activityLabel(tag.activity_slug, activityNames, taxonomyActivities, locale))
    .join(", ");
  if (tags) {
    return locale === "en"
      ? `Point of interest: ${tags}.`
      : `Miejsce z kategorii: ${tags}.`;
  }

  return locale === "en"
    ? "No detailed description yet — add to your plan if the location fits your trip."
    : "Brak szczegółowego opisu — dodaj do planu, jeśli lokalizacja pasuje do wyjazdu.";
}

function AttractionDetailPanel({
  attraction,
  activityNames,
  taxonomyActivities,
  inPlan,
  onTogglePlan,
}: {
  attraction: AttractionWithActivities;
  activityNames: Record<string, string>;
  taxonomyActivities: TaxonomyActivity[];
  inPlan: boolean;
  onTogglePlan: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const name = toPolishAttractionName(attraction.name, locale);
  const tags = attraction.activity_tags.map((tag) =>
    activityLabel(tag.activity_slug, activityNames, taxonomyActivities, locale),
  );

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="font-display text-lg font-bold leading-tight text-text-primary">
          {name}
        </h3>
        {tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-bg-soft px-2 py-0.5 text-[11px] font-medium text-text-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <p className="text-sm leading-snug text-text-primary">
        {attractionSummary(attraction, activityNames, taxonomyActivities, locale)}
      </p>

      {attraction.duration_minutes != null && attraction.duration_minutes > 0 && (
        <p className="text-xs text-text-secondary">
          {locale === "en" ? "Visit time" : "Czas wizyty"}: ~
          {Math.max(1, Math.round(attraction.duration_minutes / 60))}h
        </p>
      )}

      {attraction.address?.trim() && (
        <p className="text-xs text-text-tertiary">{attraction.address.trim()}</p>
      )}

      <div className="border-t border-border-default pt-3">
        <Button
          size="sm"
          className="w-full"
          variant={inPlan ? "secondary" : "primary"}
          onClick={onTogglePlan}
        >
          {inPlan ? t("island.removeFromPlan") : t("island.addToPlan")}
        </Button>
      </div>
    </div>
  );
}

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
    () =>
      Object.keys(overview.activity_counts).sort(
        (a, b) => overview.activity_counts[b] - overview.activity_counts[a],
      ),
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
    () => filteredAttractions.find((a) => a.id === selectedPointId) ?? null,
    [filteredAttractions, selectedPointId],
  );

  const plannedAttractions = useMemo(
    () => overview.attractions.filter((a) => planIds.has(a.id)),
    [overview.attractions, planIds],
  );

  useEffect(() => {
    if (selectedPointId && filteredAttractions.some((a) => a.id === selectedPointId)) {
      return;
    }
    if (filteredAttractions.length === 1) {
      setSelectedPointId(filteredAttractions[0]!.id);
      return;
    }
    setSelectedPointId(null);
  }, [filteredAttractions, selectedPointId]);

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
      <p className="mb-2 text-sm text-text-secondary">
        {t("island.subtitle", {
          count: results.total_attractions_considered,
          filtered: filteredAttractions.length,
          selected: planIds.size,
        })}
      </p>
      <p className="mb-6 text-sm text-text-secondary">{t("island.introDesktop")}</p>

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

      <div className="mb-6 flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] lg:items-start lg:gap-4">
        <div className="min-w-0">
          <RegionMap
            points={mapData.points}
            segments={[]}
            height={520}
            showRouteList={false}
            highlightedPointId={selectedPointId}
            suppressInfoWindow
            onPointClick={(point) => {
              if (point.type === "attraction") setSelectedPointId(point.id);
            }}
          />
          <p className="mt-2 text-sm text-text-secondary">{t("island.mapHint")}</p>
          {results.total_attractions_considered > overview.attractions.length && (
            <p className="mt-1 text-xs text-text-tertiary">
              {t("island.mapCap", {
                shown: overview.attractions.length,
                total: results.total_attractions_considered,
              })}
            </p>
          )}
        </div>

        <aside className="max-h-[min(72vh,640px)] overflow-y-auto rounded-xl border border-border-default bg-white p-3 shadow-card lg:w-full lg:max-w-[300px] lg:justify-self-end">
          {plannedAttractions.length > 0 && (
            <div className="mb-3 border-b border-border-default pb-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                {t("island.yourSelection")} ({plannedAttractions.length})
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {plannedAttractions.map((attraction) => (
                  <li key={attraction.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedPointId(attraction.id)}
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                        selectedPointId === attraction.id
                          ? "border-brand-700 bg-brand-50 text-brand-800"
                          : "border-border-default bg-bg-soft text-text-secondary hover:border-brand-200",
                      )}
                    >
                      {toPolishAttractionName(attraction.name, locale)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedAttraction ? (
            <AttractionDetailPanel
              key={selectedAttraction.id}
              attraction={selectedAttraction}
              activityNames={activityNames}
              taxonomyActivities={taxonomyActivities}
              inPlan={planIds.has(selectedAttraction.id)}
              onTogglePlan={() => togglePlan(selectedAttraction.id)}
            />
          ) : filteredAttractions.length > 0 ? (
            <p className="py-4 text-center text-sm text-text-secondary">
              {t("island.clickMapHint")}
            </p>
          ) : (
            <p className="py-4 text-center text-sm text-text-secondary">
              {t("island.noFilters")}
            </p>
          )}

          {filteredAttractions.length > 1 && (
            <div className="mt-4 border-t border-border-default pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                {t("island.browseList", { n: filteredAttractions.length })}
              </p>
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {filteredAttractions.map((attraction) => {
                  const name = toPolishAttractionName(attraction.name, locale);
                  const isActive = selectedPointId === attraction.id;
                  return (
                    <li key={attraction.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedPointId(attraction.id)}
                        className={cn(
                          "w-full rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
                          isActive
                            ? "border-brand-300 bg-brand-50 text-brand-900"
                            : "border-border-default/80 text-text-secondary hover:border-brand-200 hover:bg-bg-soft",
                        )}
                      >
                        <span className="font-medium text-text-primary">{name}</span>
                        {planIds.has(attraction.id) && (
                          <span className="ml-1.5 text-[10px] font-semibold text-brand-700">
                            ✓
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>
      </div>

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
              const label = activityLabel(
                slug,
                activityNames,
                taxonomyActivities,
                locale,
              );
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
            <div className="mt-4 space-y-3 border-t border-border-default pt-4">
              <p className="text-sm text-text-secondary">
                {t("island.planSelected", { n: planIds.size })}
              </p>
              {onPlanTrip && (
                <Button
                  size="lg"
                  onClick={() => onPlanTrip([...planIds], overview.attractions)}
                >
                  {t("island.planTripCta")}
                </Button>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}

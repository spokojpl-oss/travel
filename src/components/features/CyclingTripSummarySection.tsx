"use client";

import { useMemo } from "react";
import { RegionMap } from "@/components/features/RegionMap";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { SkeletonList } from "@/components/ui/Skeleton";
import { CyclingRouteKomootLink } from "@/components/activities/cycling/CyclingRouteKomootLink";
import { CYCLING_TYPE_LABELS } from "@/lib/activities/cycling/constants";
import { sumRouteElevationGainM, resolveRouteElevationGainM } from "@/lib/activities/cycling/elevation";
import {
  cyclingRouteMapsUrl,
  cyclingRouteOsmUrl,
} from "@/lib/activities/cycling/route-links";
import { buildCyclingSummaryMapData } from "@/lib/maps/build-cycling-summary-map";
import { toPolishAttractionName } from "@/lib/plan/attraction-display-name";
import type { DestinationSummary } from "@/lib/synthesis/destination-summary";
import type { DestinationBuildPayload } from "@/lib/search/destination-build-payload";
import type { GeoCluster } from "@/types/domain";
import { useLocale, useT } from "@/i18n/locale-provider";

type CyclingTripSummarySectionProps = {
  cluster: GeoCluster;
  payload: DestinationBuildPayload;
  summary: DestinationSummary | null;
  summaryLoading?: boolean;
};

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: "map-pin" | "route" | "bike" | "calendar" | "sparkles";
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border-default bg-gradient-to-br from-white to-bg-soft/80 p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-brand-700">
        <Icon name={icon} size={16} />
        <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          {label}
        </span>
      </div>
      <p className="font-display text-lg font-bold leading-tight text-text-primary">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">{hint}</p>
      )}
    </div>
  );
}

export function CyclingTripSummarySection({
  cluster,
  payload,
  summary,
  summaryLoading = false,
}: CyclingTripSummarySectionProps) {
  const t = useT();
  const { locale } = useLocale();
  const pl = locale !== "en";

  const mapData = useMemo(
    () => buildCyclingSummaryMapData(cluster, payload, locale),
    [cluster, payload, locale],
  );

  const routes = payload.selectedCyclingRoutes ?? [];
  const totalCyclingKm = routes.reduce((sum, route) => sum + route.distance_m / 1000, 0);
  const totalElevation = sumRouteElevationGainM(routes);
  const baseName =
    payload.lodgingBase?.name ??
    cluster.settlement?.name ??
    (pl ? "Baza noclegowa" : "Lodging base");
  const regionName = payload.region
    ? pl
      ? payload.region.name_pl
      : payload.region.name_en
    : null;
  const places = cluster.attractions;

  return (
    <section className="mb-10">
      <header className="mb-6">
        <h2 className="font-display text-2xl font-bold text-text-primary md:text-3xl">
          {t("destination.cyclingSummaryTitle")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
          {t("destination.cyclingSummarySubtitle")}
        </p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon="map-pin"
          label={t("destination.cyclingSummaryBase")}
          value={baseName}
          hint={regionName ?? undefined}
        />
        <StatCard
          icon="bike"
          label={t("destination.cyclingSummaryRoutes")}
          value={String(routes.length)}
          hint={
            routes.length > 0
              ? t("destination.cyclingSummaryRoutesHint", {
                  km: totalCyclingKm.toFixed(0),
                })
              : t("destination.cyclingSummaryNoRoutes")
          }
        />
        <StatCard
          icon="sparkles"
          label={t("destination.cyclingSummaryElevation")}
          value={
            totalElevation > 0
              ? `${totalElevation.toLocaleString(locale)} m+`
              : "—"
          }
          hint={
            totalElevation > 0
              ? t("destination.cyclingSummaryElevationHint")
              : undefined
          }
        />
        <StatCard
          icon="route"
          label={t("destination.cyclingSummaryPlaces")}
          value={String(places.length)}
          hint={
            payload.tripDays
              ? t("destination.cyclingSummaryTripDays", {
                  n: String(payload.tripDays),
                })
              : undefined
          }
        />
      </div>

      <Card className="mb-6 overflow-hidden border-border-default shadow-sm">
        <CardHeader title={t("destination.cyclingSummaryMapTitle")} />
        <RegionMap
          points={mapData.points}
          segments={[]}
          cyclingRoutes={mapData.cyclingRoutes}
          height={520}
          showRouteList={false}
          showCyclingRouteList={false}
          showLegend
          className="border-0 shadow-none"
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {routes.length > 0 && (
          <Card className="border-border-default shadow-sm">
            <CardHeader title={t("destination.cyclingRoutesTitle")} />
            <CardBody>
              <ul className="space-y-3">
                {routes.map((route) => {
                  const mapsUrl = cyclingRouteMapsUrl(route, locale);
                  const osmUrl = cyclingRouteOsmUrl(route);
                  const description = route.description?.trim();

                  return (
                    <li
                      key={route.id}
                      className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-white p-4"
                    >
                      <p className="font-medium text-text-primary">{route.name}</p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {CYCLING_TYPE_LABELS[route.activity_type]} ·{" "}
                        {(route.distance_m / 1000).toFixed(1)} km
                        {(() => {
                          const gain = resolveRouteElevationGainM(route);
                          return gain != null ? ` · ${gain} m+` : "";
                        })()}
                      </p>
                      {description && (
                        <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                          {description}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                        <CyclingRouteKomootLink route={route} compact />
                        {mapsUrl && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-brand-700 hover:underline"
                          >
                            {t("destination.cyclingRouteOpenMaps")} →
                          </a>
                        )}
                        {osmUrl && (
                          <a
                            href={osmUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-brand-700 hover:underline"
                          >
                            OpenStreetMap →
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>
        )}

        <div className="space-y-6">
          {places.length > 0 && (
            <Card className="border-border-default shadow-sm">
              <CardHeader title={t("destination.cyclingSummarySelectedPlaces")} />
              <CardBody>
                <ul className="space-y-2">
                  {places.map((place) => (
                    <li
                      key={place.id}
                      className="flex items-start gap-2 rounded-lg bg-bg-soft/60 px-3 py-2 text-sm"
                    >
                      <Icon
                        name="map-pin"
                        size={14}
                        className="mt-0.5 shrink-0 text-emerald-600"
                      />
                      <span className="text-text-primary">
                        {toPolishAttractionName(place.name, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          {(summaryLoading || summary) && (
            <Card className="border-border-default shadow-sm">
              <CardHeader title={t("destination.cyclingSummaryAiTitle")} />
              <CardBody>
                {summaryLoading && !summary ? (
                  <SkeletonList count={3} />
                ) : summary ? (
                  <div className="space-y-4 text-sm leading-relaxed text-text-secondary">
                    <p>{summary.overview}</p>
                    {summary.why_matches_query && (
                      <p>
                        <strong className="text-text-primary">
                          {t("destination.cyclingSummaryWhyMatch")}
                        </strong>{" "}
                        {summary.why_matches_query}
                      </p>
                    )}
                    {summary.highlights?.length > 0 && (
                      <ul className="space-y-2">
                        {summary.highlights.slice(0, 4).map((item, index) => (
                          <li key={index}>
                            <strong className="text-text-primary">
                              {item.title}
                            </strong>{" "}
                            — {item.description}
                          </li>
                        ))}
                      </ul>
                    )}
                    {summary.local_tips?.length > 0 && (
                      <>
                        <p className="font-medium text-text-primary">
                          {t("destination.cyclingSummaryTips")}
                        </p>
                        <ul className="list-disc space-y-1 pl-5">
                          {summary.local_tips.slice(0, 4).map((tip, index) => (
                            <li key={index}>{tip}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                ) : null}
              </CardBody>
            </Card>
          )}

          {payload.region && (
            <Card className="border-border-default shadow-sm">
              <CardHeader
                title={
                  pl ? payload.region.name_pl : payload.region.name_en
                }
              />
              <CardBody>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {pl ? payload.region.overview_pl : payload.region.overview_en}
                </p>
                {(pl ? payload.region.stay_hint_pl : payload.region.stay_hint_en) && (
                  <p className="mt-3 rounded-lg bg-brand-50/60 px-3 py-2 text-xs text-brand-900">
                    {pl ? payload.region.stay_hint_pl : payload.region.stay_hint_en}
                  </p>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}

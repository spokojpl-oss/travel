"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { CYCLING_TYPE_LABELS } from "@/lib/activities/cycling/constants";
import {
  cyclingRouteMapsUrl,
  cyclingRouteOsmUrl,
} from "@/lib/activities/cycling/route-links";
import { CyclingRouteKomootLink } from "@/components/activities/cycling/CyclingRouteKomootLink";
import type { ActivityRoute } from "@/types/activities";
import { useLocale, useT } from "@/i18n/locale-provider";

export function CyclingRoutesPlanLinks({
  routes,
}: {
  routes: ActivityRoute[];
}) {
  const t = useT();
  const { locale } = useLocale();

  if (routes.length === 0) return null;

  return (
    <Card className="mb-8">
      <CardHeader title={t("destination.cyclingRoutesTitle")} />
      <CardBody>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {routes.map((route) => {
            const mapsUrl = cyclingRouteMapsUrl(route, locale);
            const osmUrl = cyclingRouteOsmUrl(route);
            const description = route.description?.trim();

            return (
              <li
                key={route.id}
                className="rounded-lg border border-border-default bg-bg-soft/50 p-3"
              >
                <p className="font-medium text-text-primary">{route.name}</p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {CYCLING_TYPE_LABELS[route.activity_type]} ·{" "}
                  {(route.distance_m / 1000).toFixed(1)} km
                  {route.elevation_gain_m != null &&
                    ` · ${route.elevation_gain_m} m+`}
                </p>
                {description && (
                  <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                    {description}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
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
  );
}

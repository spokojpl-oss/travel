"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { SkeletonList } from "@/components/ui/Skeleton";
import type { CyclingDestinationSummary } from "@/lib/synthesis/cycling-destination-summary";
import { CyclingActivityProvider } from "./CyclingActivityContext";
import { CyclingFilters } from "./CyclingFilters";
import { CyclingRoutesList } from "./CyclingRoutesList";

export function CyclingDestinationView({
  destinationId,
  destinationName,
  destinationCenter,
  countryCode,
  summary,
  summaryLoading,
}: {
  destinationId: string;
  destinationName: string;
  destinationCenter: { lat: number; lng: number };
  countryCode?: string;
  summary: CyclingDestinationSummary | null;
  summaryLoading: boolean;
}) {
  return (
    <CyclingActivityProvider
      destinationId={destinationId}
      destinationCenter={destinationCenter}
    >
      <div className="space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            Wyjazd rowerowy
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold text-text-primary">
            {destinationName}
          </h1>
          {countryCode && (
            <p className="mt-1 text-sm text-text-secondary">{countryCode}</p>
          )}
          {summary?.terrain_character && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-800">
              <Icon name="target" size={14} />
              {summary.terrain_character}
            </p>
          )}
        </header>

        {(summaryLoading || summary) && (
          <Card>
            <CardHeader title="Region na rower" />
            <CardBody className="space-y-5">
              {summaryLoading && !summary && <SkeletonList count={4} />}
              {summary && (
                <>
                  <p className="text-text-primary leading-relaxed">
                    {summary.overview}
                  </p>
                  <p className="rounded-lg border border-brand-100 bg-brand-50/50 px-4 py-3 text-sm text-text-primary">
                    <strong>Dlaczego warto:</strong> {summary.why_good_for_cycling}
                  </p>

                  {summary.classic_routes.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-text-primary">
                        Klasyczne trasy i pętle
                      </h3>
                      <ul className="space-y-2">
                        {summary.classic_routes.map((r) => (
                          <li
                            key={r.name}
                            className="rounded-md border border-border-default px-3 py-2 text-sm"
                          >
                            <span className="font-medium text-text-primary">
                              {r.name}
                            </span>
                            <span className="text-text-secondary">
                              {" "}
                              — {r.description}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.wind_and_weather && (
                    <p className="text-sm text-text-secondary">
                      <strong className="text-text-primary">Pogoda i wiatr:</strong>{" "}
                      {summary.wind_and_weather}
                    </p>
                  )}

                  {summary.best_base_towns.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-text-primary">
                        Bazy kolarskie
                      </h3>
                      <ul className="space-y-1.5 text-sm text-text-secondary">
                        {summary.best_base_towns.map((b) => (
                          <li key={b.name}>
                            <strong className="text-text-primary">{b.name}</strong>
                            {" — "}
                            {b.reasoning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.bike_services_tips.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-text-primary">
                        Rowery i serwis
                      </h3>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
                        {summary.bike_services_tips.map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.season_tips.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-text-primary">
                        Sezon
                      </h3>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
                        {summary.season_tips.map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.road_warnings.length > 0 && (
                    <div className="rounded-lg border border-warning/40 bg-orange-50/60 px-4 py-3">
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-primary">
                        <Icon name="alert-triangle" size={14} className="text-warning" />
                        Uwagi na drodze
                      </h3>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
                        {summary.road_warnings.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        )}

        <section aria-label="Mapa i trasy rowerowe" className="space-y-4">
          <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-4">
            <CyclingFilters destinationId={destinationId} />
            <CyclingRoutesList destinationId={destinationId} />
          </div>
        </section>
      </div>
    </CyclingActivityProvider>
  );
}

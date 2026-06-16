"use client";

import { RegionMapMini } from "@/components/features/RegionMap";
import { buildClusterMapData } from "@/lib/maps/build-cluster-map";
import type { IslandMapAirport } from "@/lib/maps/build-island-map";
import { buildRegionPreview } from "@/lib/search/region-preview";
import { clusterDisplayName } from "@/lib/search/settlement-resolver";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { GeoCluster } from "@/types/domain";
import type { Locale } from "@/i18n/config";

export function RegionResultCard({
  cluster,
  idx,
  airports = [],
  destinationLabel,
  activityNames,
  locale,
  onOpen,
  ctaLabel,
}: {
  cluster: GeoCluster;
  idx?: number;
  airports?: IslandMapAirport[];
  destinationLabel?: string;
  activityNames: Record<string, string>;
  locale: Locale;
  onOpen: () => void;
  ctaLabel: string;
}) {
  const mapData = buildClusterMapData(cluster, airports);
  const preview = buildRegionPreview({
    cluster,
    destinationLabel,
    activityNames,
    locale,
  });

  return (
    <Card className="card-hover mb-4 overflow-hidden">
      <RegionMapMini points={mapData.points} segments={mapData.segments} />
      <CardBody className="space-y-4">
        <div>
          <h3 className="font-display text-lg font-bold text-text-primary">
            {idx != null ? `#${idx + 1} – ` : ""}
            {clusterDisplayName(cluster)}
          </h3>
          {cluster.settlement?.name &&
            cluster.settlement.name !== preview.name && (
              <p className="mt-1 text-sm text-text-tertiary">
                Proponowana baza: {cluster.settlement.name}
              </p>
            )}
        </div>

        <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4 text-sm">
          <p className="leading-relaxed text-text-primary">{preview.overview}</p>
          <p className="mt-3 leading-relaxed text-text-secondary">
            {preview.stayHint}
          </p>
        </div>

        {preview.highlights.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              {locale === "en" ? "Worth seeing nearby" : "W okolicy warto zobaczyć"}
            </p>
            <ul className="space-y-1 text-sm text-text-secondary">
              {preview.highlights.map((name) => (
                <li key={name} className="flex gap-2">
                  <span className="text-brand-600">·</span>
                  <span>{name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {preview.activitiesLine && (
          <p className="text-sm text-text-secondary">
            <span className="font-medium text-text-primary">
              {locale === "en" ? "Your activities:" : "Wasze aktywności:"}
            </span>{" "}
            {preview.activitiesLine}
          </p>
        )}

        <Button size="sm" onClick={onOpen}>
          {ctaLabel}
        </Button>
      </CardBody>
    </Card>
  );
}

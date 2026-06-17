"use client";

import { RegionMapMini } from "@/components/features/RegionMap";
import { buildClusterMapData } from "@/lib/maps/build-cluster-map";
import type { IslandMapAirport } from "@/lib/maps/build-island-map";
import { buildCyclingRegionPreview } from "@/lib/search/region-preview";
import { clusterDisplayName } from "@/lib/search/settlement-resolver";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { GeoCluster } from "@/types/domain";
import type { Locale } from "@/i18n/config";

export function CyclingRegionResultCard({
  cluster,
  idx,
  airports = [],
  destinationLabel,
  locale,
  onOpen,
}: {
  cluster: GeoCluster;
  idx?: number;
  airports?: IslandMapAirport[];
  destinationLabel?: string;
  locale: Locale;
  onOpen: () => void;
}) {
  const mapData = buildClusterMapData(cluster, airports, {
    locale,
    maxAttractions: 6,
  });
  const preview = buildCyclingRegionPreview({
    cluster,
    destinationLabel,
    locale,
  });

  return (
    <Card className="card-hover mb-4 overflow-hidden">
      <RegionMapMini points={mapData.points} segments={mapData.segments} />
      <CardBody className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            Baza kolarska
          </p>
          <h3 className="font-display mt-0.5 text-lg font-bold text-text-primary">
            {idx != null ? `#${idx + 1} – ` : ""}
            {clusterDisplayName(cluster)}
          </h3>
        </div>

        <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4 text-sm">
          <p className="leading-relaxed text-text-primary">{preview.overview}</p>
          <p className="mt-3 leading-relaxed text-text-secondary">
            {preview.cyclingHint}
          </p>
        </div>

        {preview.infrastructureLine && (
          <p className="text-sm text-text-secondary">
            <span className="font-medium text-text-primary">Infrastruktura:</span>{" "}
            {preview.infrastructureLine}
          </p>
        )}

        <Button className="w-full" onClick={onOpen}>
          Zobacz trasy w tym rejonie →
        </Button>
      </CardBody>
    </Card>
  );
}

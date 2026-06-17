"use client";

import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CyclingRouteKomootLink } from "@/components/activities/cycling/CyclingRouteKomootLink";
import { cn } from "@/lib/utils/cn";
import type { ActivityRoute, SurfaceMix } from "@/types/activities";
import {
  CYCLING_TYPE_LABELS,
  DIFFICULTY_LABELS,
} from "@/lib/activities/cycling/constants";
import type { RouteBeachProximity } from "@/lib/plan/cycling-plan";
import { useT } from "@/i18n/locale-provider";

const SURFACE_COLORS: Record<keyof SurfaceMix, string> = {
  asphalt: "bg-brand-700",
  paved: "bg-brand-500",
  gravel: "bg-warning",
  dirt: "bg-accent-500",
  rock: "bg-text-secondary",
};

function SurfaceMixBar({ mix }: { mix: SurfaceMix | null }) {
  if (!mix) return null;
  const entries = Object.entries(mix).filter(([, v]) => (v ?? 0) > 0) as Array<
    [keyof SurfaceMix, number]
  >;
  if (entries.length === 0) return null;

  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-bg-hover">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className={cn(SURFACE_COLORS[key], "h-full")}
          style={{ width: `${Math.round(value * 100)}%` }}
          title={key}
        />
      ))}
    </div>
  );
}

function ElevationProfile({
  profile,
}: {
  profile: ActivityRoute["elevation_profile"];
}) {
  if (!profile?.length) return null;

  const values = profile.map((p) => p.elev_m);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const width = 120;
  const height = 32;

  const points = profile
    .map((p, i) => {
      const x = (i / Math.max(profile.length - 1, 1)) * width;
      const y = height - ((p.elev_m - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-8 w-[120px] text-brand-700"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
}

export function CyclingRouteCard({
  route,
  selected,
  inPlan,
  beachProximity = null,
  compact = false,
  compactGrid = false,
  onSelect,
  onTogglePlan,
}: {
  route: ActivityRoute;
  selected: boolean;
  inPlan: boolean;
  beachProximity?: RouteBeachProximity | null;
  compact?: boolean;
  compactGrid?: boolean;
  onSelect: () => void;
  onTogglePlan: () => void;
}) {
  const t = useT();
  const distanceKm = (route.distance_m / 1000).toFixed(1);

  return (
    <Card
      className={cn(
        "cursor-pointer transition-shadow hover:shadow-md",
        selected && "ring-2 ring-brand-700",
      )}
      onClick={onSelect}
    >
      <CardBody
        className={cn(
          compactGrid ? "space-y-1.5 p-2" : compact ? "space-y-2 p-3" : "space-y-3",
        )}
      >
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0">
            <h3
              className={cn(
                "font-display font-bold text-text-primary",
                compactGrid ? "truncate text-base leading-tight" : "text-base",
              )}
            >
              {route.name}
            </h3>
            <p className="text-xs text-text-secondary">
              {CYCLING_TYPE_LABELS[route.activity_type]}
            </p>
          </div>
          {route.difficulty && !compactGrid && (
            <Badge variant="default">{DIFFICULTY_LABELS[route.difficulty]}</Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-text-secondary">
          <span>{distanceKm} km</span>
          {route.elevation_gain_m != null && (
            <span>{route.elevation_gain_m} m+</span>
          )}
          {beachProximity && (
            <span className="text-emerald-700">
              · {beachProximity.beachName} {beachProximity.distanceKm} km
            </span>
          )}
          {route.max_gradient_pct != null && !compactGrid && (
            <span>max {route.max_gradient_pct}%</span>
          )}
        </div>

        {!compactGrid && <SurfaceMixBar mix={route.surface_mix} />}

        {selected && (
          <div className="rounded-md border border-brand-100 bg-brand-50/50 px-2 py-1.5">
            <CyclingRouteKomootLink route={route} compact={compactGrid} />
            <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">
              {route.source === "komoot"
                ? t("cycling.komootTourHint")
                : t("cycling.komootImportHint")}
            </p>
          </div>
        )}

        <div
          className={cn(
            "flex gap-2",
            compactGrid ? "flex-col" : "items-center justify-between",
          )}
        >
          {!compactGrid && <ElevationProfile profile={route.elevation_profile} />}
          <Button
            size="sm"
            variant={inPlan ? "secondary" : "primary"}
            className={compactGrid ? "w-full" : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlan();
            }}
          >
            {inPlan ? "Usuń z planu" : "Dodaj do planu"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

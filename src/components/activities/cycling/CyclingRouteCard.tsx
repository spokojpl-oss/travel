"use client";

import type { ActivityRoute, SurfaceMix } from "@/types/activities";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import {
  CYCLING_TYPE_LABELS,
  DIFFICULTY_LABELS,
} from "@/lib/activities/cycling/constants";

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
  compact = false,
  onSelect,
  onTogglePlan,
}: {
  route: ActivityRoute;
  selected: boolean;
  inPlan: boolean;
  compact?: boolean;
  onSelect: () => void;
  onTogglePlan: () => void;
}) {
  const distanceKm = (route.distance_m / 1000).toFixed(1);

  return (
    <Card
      className={cn(
        "cursor-pointer transition-shadow hover:shadow-md",
        selected && "ring-2 ring-brand-700",
      )}
      onClick={onSelect}
    >
      <CardBody className={cn(compact ? "space-y-2 p-3" : "space-y-3")}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-bold text-text-primary">
              {route.name}
            </h3>
            <p className="text-xs text-text-secondary">
              {CYCLING_TYPE_LABELS[route.activity_type]}
            </p>
          </div>
          {route.difficulty && (
            <Badge variant="default">{DIFFICULTY_LABELS[route.difficulty]}</Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-text-secondary">
          <span>{distanceKm} km</span>
          {route.elevation_gain_m != null && (
            <span>{route.elevation_gain_m} m+</span>
          )}
          {route.max_gradient_pct != null && (
            <span>max {route.max_gradient_pct}%</span>
          )}
        </div>

        <SurfaceMixBar mix={route.surface_mix} />

        <div className="flex items-center justify-between gap-3">
          <ElevationProfile profile={route.elevation_profile} />
          <Button
            size="sm"
            variant={inPlan ? "secondary" : "primary"}
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

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import {
  CYCLING_ACTIVITY_TYPES,
  CYCLING_TYPE_LABELS,
} from "@/lib/activities/cycling/constants";
import type { ActivityComponentProps } from "@/lib/activities/registry";
import { useCyclingActivity } from "./CyclingActivityContext";
import type { ActivityType } from "@/types/activities";

export function CyclingFilters({ destinationId }: ActivityComponentProps) {
  const { filters, setFilters, refreshRoutes } = useCyclingActivity();

  useEffect(() => {
    void refreshRoutes();
  }, [filters, refreshRoutes]);

  return (
    <div className="rounded-xl border border-border-default bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="min-w-[200px] flex-1">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Typ trasy
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={!filters.activityType ? "primary" : "ghost"}
              onClick={() => setFilters({ ...filters, activityType: undefined })}
            >
              Wszystkie
            </Button>
            {CYCLING_ACTIVITY_TYPES.map((type) => (
              <Button
                key={type}
                size="sm"
                variant={filters.activityType === type ? "primary" : "ghost"}
                onClick={() =>
                  setFilters({
                    ...filters,
                    activityType: type as ActivityType,
                  })
                }
              >
                {CYCLING_TYPE_LABELS[type]}
              </Button>
            ))}
          </div>
        </div>

        <label className="min-w-[140px] flex-1">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Min. {Math.round((filters.minDistanceM ?? 0) / 1000)} km
          </span>
          <input
            type="range"
            min={0}
            max={150}
            step={5}
            value={Math.round((filters.minDistanceM ?? 0) / 1000)}
            onChange={(e) =>
              setFilters({
                ...filters,
                minDistanceM: Number(e.target.value) * 1000 || undefined,
              })
            }
            className="w-full accent-brand-700"
          />
        </label>

        <label className="min-w-[140px] flex-1">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Max.{" "}
            {filters.maxDistanceM
              ? `${Math.round(filters.maxDistanceM / 1000)} km`
              : "∞ km"}
          </span>
          <input
            type="range"
            min={10}
            max={200}
            step={5}
            value={Math.round((filters.maxDistanceM ?? 200000) / 1000)}
            onChange={(e) =>
              setFilters({
                ...filters,
                maxDistanceM: Number(e.target.value) * 1000,
              })
            }
            className="w-full accent-brand-700"
          />
        </label>

        <label className="min-w-[140px] flex-1">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Przewyższenie{" "}
            {filters.maxElevationGain
              ? `${filters.maxElevationGain} m`
              : "∞"}
          </span>
          <input
            type="range"
            min={0}
            max={3000}
            step={100}
            value={filters.maxElevationGain ?? 3000}
            onChange={(e) =>
              setFilters({
                ...filters,
                maxElevationGain: Number(e.target.value) || undefined,
              })
            }
            className="w-full accent-brand-700"
          />
        </label>
      </div>
    </div>
  );
}

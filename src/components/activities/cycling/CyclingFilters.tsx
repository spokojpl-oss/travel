"use client";

import { useEffect } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  CYCLING_ACTIVITY_TYPES,
  CYCLING_DIFFICULTIES,
  CYCLING_TYPE_LABELS,
  DIFFICULTY_LABELS,
} from "@/lib/activities/cycling/constants";
import type { ActivityComponentProps } from "@/lib/activities/registry";
import { useCyclingActivity } from "./CyclingActivityContext";
import type { ActivityDifficulty, ActivityType } from "@/types/activities";

export function CyclingFilters({ destinationId }: ActivityComponentProps) {
  const { filters, setFilters, refreshRoutes } = useCyclingActivity();

  useEffect(() => {
    void refreshRoutes();
  }, [destinationId, filters, refreshRoutes]);

  function toggleDifficulty(level: ActivityDifficulty) {
    const current = new Set(filters.difficulty ?? []);
    if (current.has(level)) current.delete(level);
    else current.add(level);
    setFilters({
      ...filters,
      difficulty: current.size > 0 ? [...current] : undefined,
    });
  }

  return (
    <Card>
      <CardHeader title="Filtry" />
      <CardBody className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-text-primary">Typ trasy</p>
          <div className="flex flex-wrap gap-2">
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

        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">
            Min. dystans: {Math.round((filters.minDistanceM ?? 0) / 1000)} km
          </label>
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
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">
            Max. dystans:{" "}
            {filters.maxDistanceM
              ? `${Math.round(filters.maxDistanceM / 1000)} km`
              : "bez limitu"}
          </label>
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
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">
            Max. przewyższenie:{" "}
            {filters.maxElevationGain
              ? `${filters.maxElevationGain} m`
              : "bez limitu"}
          </label>
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
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-text-primary">Trudność</p>
          <div className="flex flex-wrap gap-2">
            {CYCLING_DIFFICULTIES.map((level) => {
              const active = filters.difficulty?.includes(level);
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => toggleDifficulty(level)}
                  className="rounded-full"
                >
                  <Badge variant={active ? "accent" : "outline"}>
                    {DIFFICULTY_LABELS[level]}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

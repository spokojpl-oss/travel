import type { AttractionWithActivities } from "@/types/domain";
import type { Json } from "@/types/database";

export type PlanAttractionKind = "nearby" | "day_trip" | "grouped_beach";

export type PlanAttractionMeta = {
  kind: PlanAttractionKind;
  drive_minutes?: number;
  drive_km?: number;
  group_size?: number;
  group_label?: string;
  curated?: boolean;
  source_region_id?: string;
};

const LEGACY_PLAN_TAG = "_plan";

export function readPlanMeta(
  attraction: AttractionWithActivities,
): PlanAttractionMeta | null {
  if (attraction.plan_meta) return attraction.plan_meta;

  const tags = attraction.tags;
  if (!tags || typeof tags !== "object" || Array.isArray(tags)) return null;
  const raw = (tags as Record<string, unknown>)[LEGACY_PLAN_TAG];
  if (!raw || typeof raw !== "object") return null;
  return raw as PlanAttractionMeta;
}

export function withPlanMeta(
  attraction: AttractionWithActivities,
  meta: PlanAttractionMeta,
): AttractionWithActivities {
  const existing =
    attraction.tags && typeof attraction.tags === "object" && !Array.isArray(attraction.tags)
      ? (attraction.tags as Record<string, unknown>)
      : {};

  const { [LEGACY_PLAN_TAG]: _legacy, ...restTags } = existing;

  return {
    ...attraction,
    plan_meta: meta,
    tags: (Object.keys(restTags).length > 0 ? restTags : null) as Json | null,
  };
}

export function isDayTripAttraction(a: AttractionWithActivities): boolean {
  return readPlanMeta(a)?.kind === "day_trip";
}

export function isGroupedBeach(a: AttractionWithActivities): boolean {
  return readPlanMeta(a)?.kind === "grouped_beach";
}

import type { IntensityLevel } from "@/types/domain";

type RawAttraction = {
  id: string;
  name: string;
  category: string;
  duration_minutes: number | null;
  description?: string | null;
  activity_tags?: Array<{ activity_slug: string }>;
};

type ActivityRow = {
  slug: string;
  intensity: IntensityLevel;
};

export function enrichAttractionsForTrip(
  attractions: RawAttraction[],
  activities: ActivityRow[],
): Array<{
  id: string;
  name: string;
  category: string;
  duration_minutes: number | null;
  description: string | null;
  intensity: IntensityLevel;
}> {
  const activityMap = new Map(activities.map((a) => [a.slug, a]));

  return attractions.map((attr) => {
    const primarySlug =
      attr.activity_tags?.[0]?.activity_slug ?? attr.category;
    const activity = activityMap.get(primarySlug);
    return {
      id: attr.id,
      name: attr.name,
      category: primarySlug,
      duration_minutes: attr.duration_minutes,
      description: attr.description ?? null,
      intensity: activity?.intensity ?? "medium",
    };
  });
}

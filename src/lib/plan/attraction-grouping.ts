import { distanceKm } from "@/lib/search/geo-clustering";
import {
  readPlanMeta,
  withPlanMeta,
  type PlanAttractionMeta,
} from "@/lib/plan/plan-attraction-meta";
import type { AttractionWithActivities, GeoPoint } from "@/types/domain";

const BEACH_SLUGS = new Set(["sandy_beaches", "rocky_beaches"]);

function point(a: AttractionWithActivities): GeoPoint {
  return { lat: Number(a.lat), lon: Number(a.lon) };
}

export function isBeachAttraction(a: AttractionWithActivities): boolean {
  if (readPlanMeta(a)?.kind === "day_trip") return false;
  const slugs = a.activity_tags.map((t) => t.activity_slug);
  if (slugs.some((s) => BEACH_SLUGS.has(s))) return true;
  const cat = (a.category ?? "").toLowerCase();
  return cat.includes("beach") || /plaż|beach/i.test(a.name);
}

function primaryActivitySlug(a: AttractionWithActivities): string {
  return a.activity_tags[0]?.activity_slug ?? a.category ?? "other";
}

/** Scala plaże w promieniu mergeKm w jedną propozycję. */
export function groupNearbyBeaches(
  attractions: AttractionWithActivities[],
  mergeKm = 2.5,
): AttractionWithActivities[] {
  const beaches = attractions.filter(isBeachAttraction);
  const rest = attractions.filter((a) => !isBeachAttraction(a));
  if (beaches.length <= 1) return attractions;

  const used = new Set<string>();
  const groups: AttractionWithActivities[][] = [];

  for (const seed of beaches) {
    if (used.has(seed.id)) continue;
    const group = [seed];
    used.add(seed.id);
    for (const other of beaches) {
      if (used.has(other.id)) continue;
      if (distanceKm(point(seed), point(other)) <= mergeKm) {
        group.push(other);
        used.add(other.id);
      }
    }
    groups.push(group);
  }

  const mergedBeaches = groups.map((group) => {
    if (group.length === 1) return group[0]!;
    const lat =
      group.reduce((s, a) => s + Number(a.lat), 0) / group.length;
    const lon =
      group.reduce((s, a) => s + Number(a.lon), 0) / group.length;
    const rep = group.sort(
      (a, b) => (b.activity_tags.length ?? 0) - (a.activity_tags.length ?? 0),
    )[0]!;
    const locality = rep.name.split(/[-–—]/)[0]?.trim() ?? rep.name;
    const meta: PlanAttractionMeta = {
      kind: "grouped_beach",
      group_size: group.length,
      group_label:
        group.length > 2
          ? `Plaże okolic ${locality}`
          : rep.name,
    };
    return withPlanMeta(
      {
        ...rep,
        id: `group:beach:${rep.id}`,
        name: meta.group_label ?? rep.name,
        lat,
        lon,
      },
      meta,
    );
  });

  return [...rest, ...mergedBeaches];
}

/** Usuwa duplikaty po id i bliskie duplikaty tej samej kategorii (non-beach). */
export function dedupeAttractionPool(
  attractions: AttractionWithActivities[],
  minSameCategoryKm = 1.2,
): AttractionWithActivities[] {
  const byId = new Map<string, AttractionWithActivities>();
  for (const a of attractions) byId.set(a.id, a);
  const list = [...byId.values()];

  const kept: AttractionWithActivities[] = [];
  for (const a of list) {
    if (isBeachAttraction(a)) {
      kept.push(a);
      continue;
    }
    const slug = primaryActivitySlug(a);
    const tooClose = kept.some(
      (k) =>
        !isBeachAttraction(k) &&
        primaryActivitySlug(k) === slug &&
        distanceKm(point(a), point(k)) < minSameCategoryKm,
    );
    if (!tooClose) kept.push(a);
  }
  return kept;
}

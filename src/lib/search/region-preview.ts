import type { Locale } from "@/i18n/config";
import { clusterDisplayName } from "@/lib/search/settlement-resolver";
import type { GeoCluster } from "@/types/domain";

export type RegionPreview = {
  name: string;
  overview: string;
  highlights: string[];
  activitiesLine: string;
  stayHint: string;
};

function uniqueNames(values: string[], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value.trim());
    if (out.length >= limit) break;
  }
  return out;
}

function formatList(items: string[], locale: Locale): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (locale === "en") {
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
  }
  if (items.length === 2) return `${items[0]} i ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} i ${items[items.length - 1]}`;
}

export function buildRegionPreview({
  cluster,
  destinationLabel,
  activityNames,
  locale = "pl",
}: {
  cluster: GeoCluster;
  destinationLabel?: string;
  activityNames: Record<string, string>;
  locale?: Locale;
}): RegionPreview {
  const name = clusterDisplayName(cluster);
  const base = cluster.settlement?.name ?? name;
  const radius = Math.round(cluster.radius_km);

  const highlightNames = uniqueNames(
    cluster.attractions.map((a) => a.name),
    5,
  );

  const activityParts = cluster.covered_activities
    .map((slug) => {
      const label = activityNames[slug] ?? slug;
      const count = cluster.activity_counts[slug];
      return count != null && count > 0 ? `${label} (${count})` : label;
    })
    .filter(Boolean);

  const dest =
    destinationLabel?.split(",")[0]?.trim() ||
    destinationLabel?.trim() ||
    null;

  let overview: string;
  let stayHint: string;

  if (locale === "en") {
    overview = dest
      ? `${base} is one of the areas we suggest around ${dest}. Within ~${radius} km of the proposed base there are ${cluster.attractions.length} matching places`
      : `Within ~${radius} km of ${base} we found ${cluster.attractions.length} matching places`;
    if (highlightNames.length > 0) {
      overview += `, including ${formatList(highlightNames, locale)}.`;
    } else {
      overview += ".";
    }

    stayHint =
      activityParts.length > 0
        ? `Good base if you want ${formatList(
            activityParts.slice(0, 4),
            locale,
          )} without long drives every day.`
        : `A practical base for exploring this part of the destination.`;
  } else {
    overview = dest
      ? `${base} to jeden z rejonów, które proponujemy na ${dest}. W promieniu ok. ${radius} km od bazy jest ${cluster.attractions.length} dopasowanych miejsc`
      : `W promieniu ok. ${radius} km od ${base} jest ${cluster.attractions.length} dopasowanych miejsc`;
    if (highlightNames.length > 0) {
      overview += `, m.in. ${formatList(highlightNames, locale)}.`;
    } else {
      overview += ".";
    }

    stayHint =
      activityParts.length > 0
        ? `Wygodna baza, jeśli chcecie ${formatList(
            activityParts.slice(0, 4),
            locale,
          )} bez codziennych dalekich dojazdów.`
        : `Praktyczna baza na zwiedzanie tej części destynacji.`;
  }

  return {
    name,
    overview,
    highlights: highlightNames,
    activitiesLine: activityParts.join(" · "),
    stayHint,
  };
}

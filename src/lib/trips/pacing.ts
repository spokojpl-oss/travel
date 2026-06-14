import type { Attraction, IntensityLevel } from "@/types/domain";

export type DayPlan = {
  date: string;
  day_number: number;
  type: "arrival" | "departure" | "full" | "rest";
  attractions: Array<{
    attraction_id: string;
    name: string;
    duration_minutes: number | null;
    category: string;
    intensity: IntensityLevel;
    time_of_day_hint: "morning" | "afternoon" | "evening" | "full_day";
  }>;
  warnings: string[];
  notes: string[];
};

const TIER1_CATEGORIES = [
  "canyons",
  "hiking_trails",
  "climbing",
  "mountain_biking",
  "diving",
];
const TIER2_CATEGORIES = [
  "caves",
  "kayaking",
  "quads",
  "surfing",
  "theme_parks",
  "paragliding",
  "snorkeling",
];
const WATER_CATEGORIES = [
  "kayaking",
  "surfing",
  "diving",
  "snorkeling",
  "boat_tour",
  "jet_ski",
  "water_parks",
];

function getActivityTier(
  attraction: Pick<Attraction, "category"> & { intensity?: IntensityLevel },
): 1 | 2 | 3 {
  if (
    TIER1_CATEGORIES.includes(attraction.category) ||
    attraction.intensity === "high"
  ) {
    return 1;
  }
  if (
    TIER2_CATEGORIES.includes(attraction.category) ||
    attraction.intensity === "medium"
  ) {
    return 2;
  }
  return 3;
}

export function planTripPacing({
  attractions,
  dateFrom,
  dateTo,
  hasYoungChildren,
}: {
  attractions: Array<
    Pick<Attraction, "id" | "name" | "category" | "duration_minutes"> & {
      intensity?: IntensityLevel;
    }
  >;
  dateFrom: string;
  dateTo: string;
  hasYoungChildren: boolean;
}): { days: DayPlan[]; total_days: number; unassigned_attractions: string[] } {
  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  const totalDays =
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const byTier = {
    tier1: attractions.filter((a) => getActivityTier(a) === 1),
    tier2: attractions.filter((a) => getActivityTier(a) === 2),
    tier3: attractions.filter((a) => getActivityTier(a) === 3),
  };

  const days: DayPlan[] = [];
  const remaining = {
    tier1: [...byTier.tier1],
    tier2: [...byTier.tier2],
    tier3: [...byTier.tier3],
  };

  for (let i = 0; i < totalDays; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    const isArrival = i === 0;
    const isDeparture = i === totalDays - 1;
    const dayType: DayPlan["type"] = isArrival
      ? "arrival"
      : isDeparture
        ? "departure"
        : "full";

    const day: DayPlan = {
      date: dateStr,
      day_number: i + 1,
      type: dayType,
      attractions: [],
      warnings: [],
      notes: [],
    };

    if (isArrival) {
      const t3 = remaining.tier3.shift();
      if (t3) {
        day.attractions.push(makeAttrEntry(t3, "afternoon"));
      }
      day.notes.push(
        "Dzień przyjazdu: zameldowanie, odpoczynek, lekka aktywność po południu",
      );
    } else if (isDeparture) {
      const t3 = remaining.tier3.shift();
      if (t3) {
        day.attractions.push(makeAttrEntry(t3, "morning"));
      }
      day.notes.push(
        "Dzień powrotu: lekka atrakcja rano, czas na pakowanie i transfer na lotnisko",
      );
    } else {
      const maxAttractionsPerDay = hasYoungChildren ? 2 : 3;
      const maxTier1PerDay = hasYoungChildren ? 0 : 1;

      if (maxTier1PerDay > 0 && remaining.tier1.length > 0) {
        const prevDay = days[days.length - 1];
        const prevHadTier1 =
          prevDay &&
          prevDay.attractions.some(
            (a) =>
              getActivityTier({
                category: a.category,
                intensity: a.intensity,
              }) === 1,
          );

        if (!prevHadTier1) {
          const t1 = remaining.tier1.shift()!;
          day.attractions.push(makeAttrEntry(t1, "full_day"));
        }
      }

      const t2Limit = day.attractions.length === 0 ? 2 : 1;
      for (
        let j = 0;
        j < t2Limit &&
        remaining.tier2.length > 0 &&
        day.attractions.length < maxAttractionsPerDay;
        j++
      ) {
        const t2 = remaining.tier2.shift()!;
        const hint: "morning" | "afternoon" =
          day.attractions.length === 0 ? "morning" : "afternoon";
        day.attractions.push(makeAttrEntry(t2, hint));
      }

      const dayIsWater = day.attractions.some((a) =>
        WATER_CATEGORIES.includes(a.category),
      );
      const prevDay = days[days.length - 1];
      const prevWasWater =
        prevDay &&
        prevDay.attractions.some((a) => WATER_CATEGORIES.includes(a.category));
      if (dayIsWater && prevWasWater) {
        day.warnings.push(
          "Dwa dni wodne z rzędu - sprawdź czy stroje wyschną. Rozważ przeplecenie z dniem suchym.",
        );
      }

      while (
        day.attractions.length < maxAttractionsPerDay &&
        remaining.tier3.length > 0
      ) {
        const t3 = remaining.tier3.shift()!;
        const hint: "evening" | "afternoon" =
          day.attractions.length >= 2 ? "evening" : "afternoon";
        day.attractions.push(makeAttrEntry(t3, hint));
      }

      if (day.attractions.length === 0) {
        day.type = "rest";
        day.notes.push(
          "Dzień regeneracji: plaża, basen, lokalna restauracja, spacer",
        );
      } else if (day.attractions.length === maxAttractionsPerDay) {
        day.notes.push(
          `Pełny dzień (${maxAttractionsPerDay} aktywności) - planuj wcześniejsze wyjście rano`,
        );
      }
    }

    days.push(day);
  }

  const unassigned = [
    ...remaining.tier1.map((a) => a.id),
    ...remaining.tier2.map((a) => a.id),
    ...remaining.tier3.map((a) => a.id),
  ];

  return { days, total_days: totalDays, unassigned_attractions: unassigned };
}

function makeAttrEntry(
  attraction: Pick<Attraction, "id" | "name" | "category" | "duration_minutes"> & {
    intensity?: IntensityLevel;
  },
  timeOfDay: "morning" | "afternoon" | "evening" | "full_day",
): DayPlan["attractions"][number] {
  return {
    attraction_id: attraction.id,
    name: attraction.name,
    duration_minutes: attraction.duration_minutes ?? null,
    category: attraction.category,
    intensity: attraction.intensity ?? "medium",
    time_of_day_hint: timeOfDay,
  };
}

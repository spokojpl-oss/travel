import type { Attraction } from "@/types/domain";

export type GroupComposition = {
  adults: number;
  children_ages: number[];
  total: number;
};

export type PropertyTypeRecommendation = {
  recommended_type: "apartment_or_villa" | "hotel" | "either";
  confidence: "high" | "medium" | "low";
  reasoning: string;
  metrics: {
    total_activity_hours: number;
    nights: number;
    hours_per_day_outside: number;
    pct_day_outside: number;
    beach_count: number;
    needs_kitchen: boolean;
    group_size: number;
  };
};

export function recommendPropertyType({
  attractions,
  nights,
  group,
  preferences,
}: {
  attractions: Pick<Attraction, "id" | "category" | "duration_minutes">[];
  nights: number;
  group: GroupComposition;
  preferences?: {
    travel_style?: "active" | "relax" | "mixed";
    accommodation_types?: string[];
    exclusions?: string[];
  };
}): PropertyTypeRecommendation {
  const totalActivityHours = attractions.reduce(
    (sum, a) => sum + (a.duration_minutes ?? 240) / 60,
    0,
  );
  const hoursPerDayOutside = nights > 0 ? totalActivityHours / nights : 0;
  const pctDayOutside = (hoursPerDayOutside / 12) * 100;

  const beachCategories = ["beach", "beach_resort"];
  const beachCount = attractions.filter((a) =>
    beachCategories.includes(a.category),
  ).length;

  const groupSize = group.total;
  const needsKitchen =
    nights >= 5 || group.children_ages.length >= 2 || groupSize >= 6;

  const metrics = {
    total_activity_hours: Math.round(totalActivityHours * 10) / 10,
    nights,
    hours_per_day_outside: Math.round(hoursPerDayOutside * 10) / 10,
    pct_day_outside: Math.round(pctDayOutside),
    beach_count: beachCount,
    needs_kitchen: needsKitchen,
    group_size: groupSize,
  };

  if (groupSize >= 8 && !preferences?.exclusions?.includes("no_apartments")) {
    return {
      recommended_type: "apartment_or_villa",
      confidence: "high",
      reasoning: `Grupa ${groupSize} osób. Hotel = ${Math.ceil(groupSize / 2)} osobnych pokoi, bez wspólnej przestrzeni, drogo. Willa lub duży apartament daje wspólny salon, kuchnię, taniej per osobę.`,
      metrics,
    };
  }

  if (hoursPerDayOutside >= 6) {
    return {
      recommended_type: "apartment_or_villa",
      confidence: "high",
      reasoning: `Wybrane atrakcje wypełniają ${metrics.pct_day_outside}% dnia (${metrics.hours_per_day_outside}h średnio). Hotel z basenem, animacjami i restauracją to inwestycja w infrastrukturę której nie zobaczycie. Apartament = śniadania we własnym tempie, prysznic po atrakcji, pranie ubrań - taniej i wygodniej.`,
      metrics,
    };
  }

  if (beachCount >= 4 && hoursPerDayOutside <= 4 && groupSize <= 6) {
    return {
      recommended_type: "hotel",
      confidence: "medium",
      reasoning: `Większość pobytu skoncentrowana na plażach (${beachCount} obiektów), mało wyjazdowych aktywności. Hotel z basenem, animacjami i posiłkami w cenie ma sens - mniej organizowania, więcej relaksu.`,
      metrics,
    };
  }

  if (needsKitchen && nights >= 7) {
    return {
      recommended_type: "apartment_or_villa",
      confidence: "medium",
      reasoning: `Pobyt ${nights} nocy z ${group.children_ages.length} dziećmi - kuchnia daje elastyczność (śniadania, podwieczorki, lekkie kolacje gdy zmęczeni po wyjazdach). Pranie ubrań w trakcie pobytu.`,
      metrics,
    };
  }

  return {
    recommended_type: "either",
    confidence: "low",
    reasoning:
      "Profil mieszany. Hotel da więcej wygody (sprzątanie, śniadania), apartament więcej swobody. Decyzja zależy od preferencji - oba mają sens.",
    metrics,
  };
}

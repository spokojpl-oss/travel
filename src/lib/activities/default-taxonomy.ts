import type { Activity, ActivityGroupWithActivities } from "@/types/domain";

function activity(
  slug: string,
  group_slug: string,
  name_pl: string,
  name_en: string,
  intensity: Activity["intensity"],
  weather_dependency: Activity["weather_dependency"],
  min_recommended_age: number,
  sort_order: number,
): Activity {
  return {
    slug,
    group_slug,
    name_pl,
    name_en,
    description: null,
    min_recommended_age,
    requires_license: false,
    intensity,
    typical_duration_minutes: null,
    weather_dependency,
    sort_order,
  };
}

/** Wbudowana taksonomia — działa nawet gdy seed activities.sql nie był uruchomiony w Supabase. */
export const DEFAULT_TAXONOMY: ActivityGroupWithActivities[] = [
  {
    slug: "water_sports",
    name_pl: "Sporty wodne",
    name_en: "Water sports",
    description: "Kajaki, snorkeling, surfing i inne",
    icon: null,
    sort_order: 10,
    activities: [
      activity("kayaking", "water_sports", "Kajaki", "Kayaking", "medium", "high", 6, 10),
      activity("paddleboard", "water_sports", "Paddleboard (SUP)", "Paddleboard", "low", "high", 8, 20),
      activity("snorkeling", "water_sports", "Snorkeling", "Snorkeling", "low", "high", 6, 30),
      activity("diving", "water_sports", "Nurkowanie", "Scuba diving", "medium", "high", 10, 40),
      activity("surfing", "water_sports", "Surfing", "Surfing", "high", "high", 8, 50),
      activity("jet_ski", "water_sports", "Skutery wodne", "Jet ski", "medium", "high", 12, 60),
      activity("boat_tour", "water_sports", "Rejs łodzią", "Boat tour", "low", "high", 4, 70),
    ],
  },
  {
    slug: "motorsports",
    name_pl: "Sporty motorowe",
    name_en: "Motor sports",
    description: "Quady, buggies, off-road",
    icon: null,
    sort_order: 20,
    activities: [
      activity("quads", "motorsports", "Quady", "Quad biking / ATV", "high", "low", 8, 10),
      activity("buggies", "motorsports", "Buggies", "Buggy / dune buggy", "high", "low", 10, 20),
      activity("paragliding", "motorsports", "Paralotnia", "Paragliding", "high", "high", 14, 30),
    ],
  },
  {
    slug: "cycling",
    name_pl: "Rowery i MTB",
    name_en: "Cycling",
    description: "Wypożyczalnie rowerów, trasy MTB",
    icon: null,
    sort_order: 30,
    activities: [
      activity("bike_rental", "cycling", "Wypożyczalnia rowerów", "Bike rental", "low", "low", 6, 10),
      activity("mountain_biking", "cycling", "MTB", "Mountain biking", "high", "low", 10, 20),
      activity("ebike_rental", "cycling", "Wypożyczalnia e-bike", "E-bike rental", "low", "low", 8, 30),
    ],
  },
  {
    slug: "hiking",
    name_pl: "Trekking",
    name_en: "Hiking",
    description: "Szlaki piesze, wspinaczka",
    icon: null,
    sort_order: 40,
    activities: [
      activity("hiking_trails", "hiking", "Szlaki piesze", "Hiking trails", "medium", "low", 6, 10),
      activity("climbing", "hiking", "Wspinaczka", "Rock climbing", "high", "low", 10, 20),
    ],
  },
  {
    slug: "nature",
    name_pl: "Natura",
    name_en: "Nature",
    description: "Jaskinie, wodospady, parki narodowe",
    icon: null,
    sort_order: 50,
    activities: [
      activity("caves", "nature", "Jaskinie", "Caves", "low", "none", 5, 10),
      activity("waterfalls", "nature", "Wodospady", "Waterfalls", "low", "low", 4, 20),
      activity("canyons", "nature", "Kaniony", "Canyons", "medium", "low", 6, 30),
      activity("viewpoints", "nature", "Punkty widokowe", "Viewpoints", "low", "low", 0, 40),
      activity("national_parks", "nature", "Parki narodowe", "National parks", "low", "low", 0, 50),
    ],
  },
  {
    slug: "culture",
    name_pl: "Kultura i historia",
    name_en: "Culture & history",
    description: "Zamki, muzea, miasteczka",
    icon: null,
    sort_order: 60,
    activities: [
      activity("castles", "culture", "Zamki", "Castles", "low", "none", 5, 10),
      activity("museums", "culture", "Muzea", "Museums", "low", "none", 6, 20),
      activity("old_towns", "culture", "Stare miasta", "Old towns", "low", "low", 0, 30),
      activity("archaeology", "culture", "Archeologia", "Archaeological sites", "low", "low", 8, 40),
    ],
  },
  {
    slug: "kids",
    name_pl: "Dla dzieci",
    name_en: "For kids",
    description: "Parki rozrywki, zoo, akwaria",
    icon: null,
    sort_order: 70,
    activities: [
      activity("theme_parks", "kids", "Parki rozrywki", "Theme parks", "medium", "low", 4, 10),
      activity("zoo", "kids", "Zoo", "Zoo", "low", "low", 2, 20),
      activity("aquarium", "kids", "Akwaria", "Aquarium", "low", "none", 2, 30),
      activity("water_parks", "kids", "Aquaparki", "Water parks", "medium", "low", 4, 40),
    ],
  },
  {
    slug: "beaches",
    name_pl: "Plaże",
    name_en: "Beaches",
    description: "Plaże piaszczyste, kamieniste, dzikie",
    icon: null,
    sort_order: 90,
    activities: [
      activity("sandy_beaches", "beaches", "Plaże piaszczyste", "Sandy beaches", "low", "high", 0, 10),
      activity("rocky_beaches", "beaches", "Plaże kamieniste", "Rocky beaches", "low", "high", 0, 20),
    ],
  },
];

export function sortTaxonomy(
  groups: ActivityGroupWithActivities[],
): ActivityGroupWithActivities[] {
  return groups
    .map((g) => ({
      ...g,
      activities: [...g.activities].sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => a.sort_order - b.sort_order);
}

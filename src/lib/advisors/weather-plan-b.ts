import { createAdminClient } from "@/lib/supabase/admin";
import type { Advisor, Advisory, AdvisorContext } from "./types";

const INDOOR_CATEGORIES = [
  "museums",
  "castles",
  "caves",
  "aquarium",
  "zoo",
  "theme_parks",
  "water_parks",
  "archaeology",
  "old_towns",
];

const OUTDOOR_CATEGORIES = [
  "hiking_trails",
  "mountain_biking",
  "kayaking",
  "snorkeling",
  "beaches",
  "surfing",
  "paragliding",
  "quads",
  "sandy_beaches",
  "rocky_beaches",
];

export const weatherPlanBAdvisor: Advisor = {
  category: "weather_plan_b",
  async analyze(context: AdvisorContext): Promise<Advisory[]> {
    if (!context.weatherDays || context.weatherDays.length === 0) return [];

    const problematicDays = context.weatherDays.filter((d) => {
      const precipProb = d.precipitation_probability ?? 0;
      const tempMax = Number(d.temp_max ?? 25);
      const precipMm = Number(d.precipitation_mm ?? 0);
      return precipProb >= 60 || tempMax < 15 || precipMm >= 10;
    });

    if (problematicDays.length === 0) return [];

    const outdoorAttractions = context.selectedAttractions.filter((a) =>
      OUTDOOR_CATEGORIES.includes(a.category),
    );
    const indoorAttractions = context.selectedAttractions.filter((a) =>
      INDOOR_CATEGORIES.includes(a.category),
    );

    if (outdoorAttractions.length === 0) return [];

    const supabase = createAdminClient();
    const selectedIds = new Set(
      context.selectedAttractions.map((a) => a.id),
    );
    const { data: allIndoor } = await supabase
      .from("attractions")
      .select("id, name, category")
      .eq("destination_id", context.destination.id)
      .in("category", INDOOR_CATEGORIES)
      .limit(20);

    const indoorAlternatives = (allIndoor ?? [])
      .filter((a) => !selectedIds.has(a.id))
      .slice(0, 10);

    const totalDays = context.weatherDays.length;
    const pctProblematic = Math.round(
      (problematicDays.length / totalDays) * 100,
    );

    const severity: Advisory["severity"] =
      pctProblematic >= 40
        ? "warning"
        : pctProblematic >= 20
          ? "suggestion"
          : "info";

    let reasoning = `${problematicDays.length} z ${totalDays} dni Twojego pobytu ma niesprzyjającą pogodę (deszcz lub niska temperatura). To ${pctProblematic}% wyjazdu. Wybrałeś ${outdoorAttractions.length} aktywności outdoor.`;

    if (indoorAttractions.length > 0) {
      reasoning += ` Już masz ${indoorAttractions.length} alternatyw indoor w planie.`;
    } else {
      reasoning += " Brak aktywności indoor w planie.";
    }

    let suggestedAction: string | undefined;
    if (indoorAlternatives.length > 0) {
      const altNames = indoorAlternatives
        .slice(0, 5)
        .map((a) => a.name)
        .join(", ");
      suggestedAction = `Dodaj do listy "plan B na deszcz": ${altNames}. Te miejsca są w okolicy i nie zależą od pogody.`;
    } else {
      suggestedAction =
        "Sprawdź lokalne muzea, akwaria, parki rozrywki, jaskinie - mogą uratować deszczowe dni.";
    }

    return [
      {
        category: "weather_plan_b",
        severity,
        title: `${problematicDays.length} dni z ryzykiem złej pogody`,
        reasoning,
        suggested_action: suggestedAction,
        source_facts: {
          problematic_days: problematicDays.map((d) => ({
            date: d.forecast_date,
            temp_max: d.temp_max,
            precipitation_probability: d.precipitation_probability,
            precipitation_mm: d.precipitation_mm,
          })),
          outdoor_attractions_count: outdoorAttractions.length,
          indoor_attractions_count: indoorAttractions.length,
          indoor_alternatives_available: indoorAlternatives.map((a) => ({
            id: a.id,
            name: a.name,
            category: a.category,
          })),
        },
      },
    ];
  },
};

import { createAdminClient } from "@/lib/supabase/admin";
import type { Advisor, Advisory, AdvisorContext } from "./types";

export const seasonalEventAdvisor: Advisor = {
  category: "seasonal_event",
  async analyze(context: AdvisorContext): Promise<Advisory[]> {
    const supabase = createAdminClient();

    const { data: holidays } = await supabase
      .from("country_holidays")
      .select("*")
      .eq("country_code", context.destination.country_code);

    if (!holidays || holidays.length === 0) return [];

    const dateFrom = new Date(context.trip.date_from);
    const dateTo = new Date(context.trip.date_to);
    const tripYear = dateFrom.getFullYear();

    const advisories: Advisory[] = [];

    for (const holiday of holidays) {
      if (!holiday.is_recurring_yearly) continue;

      const holidayDate = new Date(holiday.holiday_date);
      const monthDay = `${(holidayDate.getMonth() + 1).toString().padStart(2, "0")}-${holidayDate.getDate().toString().padStart(2, "0")}`;
      const thisYearHoliday = new Date(`${tripYear}-${monthDay}`);

      if (thisYearHoliday >= dateFrom && thisYearHoliday <= dateTo) {
        const dayDiff = Math.round(
          (thisYearHoliday.getTime() - dateFrom.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        const dayInTrip = dayDiff + 1;

        advisories.push({
          category: "seasonal_event",
          severity: holiday.severity as Advisory["severity"],
          title: `${holiday.holiday_name_pl} – ${thisYearHoliday.toISOString().split("T")[0]} (dzień ${dayInTrip} Twojego wyjazdu)`,
          reasoning: holiday.impact ?? "Święto narodowe.",
          suggested_action:
            "Zaplanuj ten dzień jako relaxacyjny (plaża, hotel). Atrakcje, muzea, sklepy mogą być zamknięte. Restauracje mogą wymagać rezerwacji.",
          source_facts: {
            holiday_name: holiday.holiday_name_pl,
            date: thisYearHoliday.toISOString().split("T")[0],
            country: context.destination.country_code,
            day_in_trip: dayInTrip,
          },
        });
      }
    }

    return advisories;
  },
};

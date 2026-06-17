import { callClaudeJson, CLAUDE_MODEL } from "@/lib/api/claude";
import {
  buildSourceData,
  validateStructuredOutput,
  type ValidationResult,
} from "@/lib/synthesis/anti-hallucination";
import { planTripPacing, type DayPlan } from "./pacing";
import type { ActivityCategory } from "@/types/activities";
import type { Attraction, Destination, IntensityLevel } from "@/types/domain";

export type ItineraryDay = DayPlan & {
  daily_summary: string;
  tips: string[];
};

export type GeneratedItinerary = {
  trip_name: string;
  destination_name: string;
  total_days: number;
  introduction: string;
  days: ItineraryDay[];
  general_notes: string[];
  unassigned_attractions: string[];
};

const ITINERARY_SCHEMA = `{
  "introduction": "2-3 zdania o ogólnym charakterze planu",
  "days": [
    {
      "daily_summary": "1-2 zdania opisu tego dnia po polsku",
      "tips": ["konkretna wskazówka czasowa lub praktyczna"]
    }
  ],
  "general_notes": ["ogólna notka odnosząca się do całego wyjazdu"]
}`;

export { CLAUDE_MODEL };

export type ActivityPlanContext = {
  category: ActivityCategory;
  selectedRouteIds: string[];
  userProfile?: { ftp?: number; weeklyHours?: number; experience?: string };
};

export async function generateItinerary({
  trip,
  destination,
  attractions,
  weatherDays,
  groupInfo,
  activityContext,
}: {
  trip: { name: string; date_from: string; date_to: string };
  destination: Destination;
  attractions: Array<
    Pick<Attraction, "id" | "name" | "category" | "duration_minutes" | "description"> & {
      intensity?: IntensityLevel;
    }
  >;
  weatherDays?: Array<{
    date: string;
    temp_max: number;
    temp_min: number;
    precipitation_mm: number;
  }>;
  groupInfo: {
    adults: number;
    children_ages: number[];
    travel_style?: string;
  };
  activityContext?: ActivityPlanContext;
}): Promise<{
  itinerary: GeneratedItinerary;
  validation: ValidationResult;
  usage: { input_tokens: number; output_tokens: number };
}> {
  const hasYoungChildren = groupInfo.children_ages.some((a) => a < 8);
  const pacing = planTripPacing({
    attractions,
    dateFrom: trip.date_from,
    dateTo: trip.date_to,
    hasYoungChildren,
  });

  const source = buildSourceData({
    attractions: attractions.map((a) => ({
      name: a.name,
      website: null,
      phone: null,
    })),
    weatherSummary: weatherDays,
  });

  const systemPrompt = `Jesteś pomocnikiem podróży który pisze plan dzień-po-dniu po polsku.
Dostajesz JUŻ WSTĘPNIE PRZYDZIELONE atrakcje per dzień (przez algorytm pacing).
Twoje zadanie: napisać dla każdego dnia 1-2 zdania opisu + 1-3 konkretne tipy.

ZASADY:
- NIE wymyślaj atrakcji których nie ma w przydziale - opisuj WYŁĄCZNIE to co Ci dano.
- Tipy konkretne: "wyrusz przed 9:00 żeby uniknąć tłumów", "weź gotówkę", "zarezerwuj online tydzień wcześniej".
- NIE generyczne typu "ciesz się dniem".
- Język naturalny, polski, jak człowiek do rodziny.
- general_notes: max 3, ogólne rzeczy odnoszące się do całego pobytu.
- Musisz zwrócić dokładnie ${pacing.total_days} elementów w tablicy "days".${
    activityContext
      ? `

KONTEKST AKTYWNOŚCI (${activityContext.category}):
Użytkownik planuje wyjazd rowerowy. Wybrane trasy są w danych wejściowych.
Układaj dni tak, aby queen stage był w środku tygodnia, dzień regeneracji przed nim,
unikaj dwóch dni z rzędu z >2000 m przewyższenia.
Dla każdego dnia rowerowego podaj godzinę startu z uwzględnieniem wschodu słońca i temperatury.
NIE wymyślaj tras — używaj wyłącznie podanych ID tras.`
      : ""
  }`;

  const userPrompt = buildItineraryPrompt({
    trip,
    destination,
    pacing,
    weatherDays,
    groupInfo,
    attractions,
    activityContext,
  });

  const { data, usage } = await callClaudeJson<{
    introduction: string;
    days: Array<{ daily_summary: string; tips: string[] }>;
    general_notes: string[];
  }>({
    systemPrompt,
    userPrompt,
    maxTokens: 3000,
    temperature: 0.4,
    schema: ITINERARY_SCHEMA,
  });

  const days: ItineraryDay[] = pacing.days.map((day, i) => ({
    ...day,
    daily_summary: data.days[i]?.daily_summary ?? "",
    tips: data.days[i]?.tips ?? [],
  }));

  const itinerary: GeneratedItinerary = {
    trip_name: trip.name,
    destination_name: destination.name,
    total_days: pacing.total_days,
    introduction: data.introduction,
    days,
    general_notes: data.general_notes ?? [],
    unassigned_attractions: pacing.unassigned_attractions,
  };

  const validation = validateStructuredOutput(
    {
      introduction: data.introduction,
      days_text: data.days
        .map((d) => `${d.daily_summary} ${d.tips.join(" ")}`)
        .join("\n"),
      general_notes: (data.general_notes ?? []).join("\n"),
    } as Record<string, unknown>,
    source,
    ["introduction", "days_text", "general_notes"],
  );

  return { itinerary, validation, usage };
}

function buildItineraryPrompt({
  trip,
  destination,
  pacing,
  weatherDays,
  groupInfo,
  attractions,
  activityContext,
}: {
  trip: { name: string; date_from: string; date_to: string };
  destination: Destination;
  pacing: ReturnType<typeof planTripPacing>;
  weatherDays?: Array<{
    date: string;
    temp_max: number;
    temp_min: number;
    precipitation_mm: number;
  }>;
  groupInfo: { adults: number; children_ages: number[]; travel_style?: string };
  attractions: Array<{ id: string; name: string; description?: string | null }>;
  activityContext?: ActivityPlanContext;
}): string {
  const sections: string[] = [];
  const attractionMap = new Map(attractions.map((a) => [a.id, a]));

  sections.push(`# TRIP
${trip.name}
Destynacja: ${destination.name} (${destination.country_code})
Daty: ${trip.date_from} do ${trip.date_to} (${pacing.total_days} dni)`);

  sections.push(`# GRUPA
Dorośli: ${groupInfo.adults}
Dzieci: ${groupInfo.children_ages.length > 0 ? `wiek ${groupInfo.children_ages.join(", ")}` : "brak"}
Styl: ${groupInfo.travel_style ?? "mixed"}`);

  if (activityContext) {
    sections.push(`# WYBRANE TRASY ROWEROWE (ID)
${activityContext.selectedRouteIds.map((id) => `- ${id}`).join("\n")}`);
    if (activityContext.userProfile) {
      sections.push(`# PROFIL KOLARZA
${JSON.stringify(activityContext.userProfile)}`);
    }
  }

  sections.push(`# POGODA W TYCH DNIACH
${(weatherDays ?? [])
  .map(
    (w) =>
      `${w.date}: ${w.temp_min}°C - ${w.temp_max}°C${w.precipitation_mm > 1 ? `, opady ${w.precipitation_mm}mm` : ""}`,
  )
  .join("\n")}`);

  sections.push(`# PLAN PACINGU (przydziel z algorytmu)
${pacing.days
  .map((day) => {
    const lines = [`## Dzień ${day.day_number} – ${day.date} (${day.type})`];
    if (day.attractions.length === 0) {
      lines.push("Brak atrakcji - dzień regeneracyjny");
    } else {
      day.attractions.forEach((a) => {
        const attr = attractionMap.get(a.attraction_id);
        lines.push(
          `- ${a.name} (${a.category}, ${a.time_of_day_hint}, ${a.duration_minutes ?? "?"} min)${
            attr?.description
              ? `\n  Opis: ${attr.description.substring(0, 200)}`
              : ""
          }`,
        );
      });
    }
    if (day.notes.length > 0) {
      lines.push(`Notatki algorytmu: ${day.notes.join("; ")}`);
    }
    if (day.warnings.length > 0) {
      lines.push(`Ostrzeżenia: ${day.warnings.join("; ")}`);
    }
    return lines.join("\n");
  })
  .join("\n\n")}`);

  sections.push(`# ZADANIE
Dla każdego z ${pacing.total_days} dni powyżej napisz:
- daily_summary: 1-2 zdania charakteryzujące dzień
- tips: 1-3 konkretne wskazówki (godziny, rezerwacje, gotówka, ubranie)

Plus general_notes (max 3): ogólne dla całego wyjazdu.
Plus introduction: 2-3 zdania o charakterze planu.

WAŻNE: opisuj TYLKO atrakcje z planu pacingu. Nie dodawaj nowych miejsc.`);

  return sections.join("\n\n");
}

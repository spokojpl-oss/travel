import { callClaudeJson } from "@/lib/api/claude";
import { apiEnv } from "@/config/api-env";
import type { SearchType } from "@/lib/search/search-types";

export type RefinementContext = {
  searchType: SearchType;
  currentParams: Record<string, unknown>;
};

export type RefinementResult = {
  understood: boolean;
  newParams: Record<string, unknown>;
  explanation: string;
  unsupported_changes: string[];
};

export async function parseRefinement({
  context,
  userText,
}: {
  context: RefinementContext;
  userText: string;
}): Promise<RefinementResult> {
  if (!apiEnv.ANTHROPIC_API_KEY) {
    return {
      understood: false,
      newParams: context.currentParams,
      explanation: "Brak konfiguracji ANTHROPIC_API_KEY",
      unsupported_changes: ["refine wymaga klucza API"],
    };
  }

  const schema = getParamsSchemaDescription(context.searchType);

  const { data } = await callClaudeJson<{
    understood: boolean;
    newParams: Record<string, unknown>;
    explanation: string;
    unsupported_changes: string[];
  }>({
    systemPrompt: `Jesteś asystentem który modyfikuje parametry wyszukiwania na podstawie polecenia użytkownika.

ZASADY:
1. Modyfikujesz TYLKO istniejące pola - NIE dodajesz nowych pól
2. Zachowujesz wszystkie pola których user nie chce zmienić
3. Jeśli user prosi o coś nieobsługiwane przez schema - dodaj do unsupported_changes
4. understood: true tylko jeśli rozumiesz konkretną zmianę
5. explanation: 1 zdanie co konkretnie zmieniłeś po polsku
6. Dla "taniej" przy hotelach: zmniejsz max_price_total o 25% jeśli jest ustawione, lub dodaj max_price_total jako 75% obecnej wartości jeśli brak
7. Dla "a we wrześniu" przy lotach: przesuń departure_date_from/to na wrzesień tego samego roku

SCHEMA POLI dla typu "${context.searchType}":
${schema}`,
    userPrompt: `# AKTUALNE PARAMETRY
${JSON.stringify(context.currentParams, null, 2)}

# POLECENIE UŻYTKOWNIKA
"${userText}"

# ZADANIE
Zmodyfikuj parametry zgodnie z poleceniem. Zachowaj pola których user nie wspomniał.`,
    schema: `{"understood": bool, "newParams": {}, "explanation": "string", "unsupported_changes": ["..."]}`,
    maxTokens: 600,
    temperature: 0.2,
  });

  return data;
}

function getParamsSchemaDescription(searchType: string): string {
  switch (searchType) {
    case "activities":
      return `{
  activities: string[] (slugi aktywności np. "bike_rental", "caves"),
  match_mode: "all" | "any",
  max_radius_km: number (5-200),
  min_per_activity: number (1-10)
}`;
    case "flights":
      return `{
  destination_id: uuid (NIE zmieniaj),
  origins: string[] (IATA polskich lotnisk),
  departure_date_from: "YYYY-MM-DD",
  departure_date_to: "YYYY-MM-DD",
  trip_length_min_days: number,
  trip_length_max_days: number,
  max_origins: number (1-8),
  max_destinations: number (1-5)
}`;
    case "hotels":
      return `{
  destination_id: uuid (NIE zmieniaj),
  selected_attraction_ids: uuid[] (NIE zmieniaj chyba że user wyraźnie powie),
  check_in: "YYYY-MM-DD",
  check_out: "YYYY-MM-DD",
  adults: number,
  children_ages: number[],
  has_rental_car: boolean,
  property_type_filter: "all" | "hotel" | "apartment" | "villa",
  min_stars: number (1-5),
  max_price_total: number (PLN)
}`;
    case "transport":
      return `{
  airport_iata: string (NIE zmieniaj),
  destination_id: uuid (NIE zmieniaj),
  to_location_name: string,
  pickup_date: "YYYY-MM-DD",
  return_date: "YYYY-MM-DD",
  adults: number,
  children_ages: number[],
  has_sports_baggage: boolean
}`;
    default:
      return "{}";
  }
}

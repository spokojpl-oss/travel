import { callClaudeJson } from "@/lib/api/claude";
import type { Destination } from "@/types/domain";

export type TodoTimeline =
  | "3_months"
  | "1_month"
  | "2_weeks"
  | "1_week"
  | "departure_day";

export type TodoItem = {
  task: string;
  category: string;
  is_critical: boolean;
  reason?: string;
};

export type GeneratedPreTripTodo = {
  destination_specific_warnings: string[];
  timeline: Record<TodoTimeline, TodoItem[]>;
};

const TODO_SCHEMA = `{
  "destination_specific_warnings": ["ostrzeżenie specyficzne dla tego kraju"],
  "timeline": {
    "3_months": [{"task": "...", "category": "documents|health|logistics|money|family", "is_critical": true, "reason": "..."}],
    "1_month": [...],
    "2_weeks": [...],
    "1_week": [...],
    "departure_day": [...]
  }
}`;

export async function generatePreTripTodo({
  destination,
  tripDateFrom,
  groupInfo,
}: {
  destination: Destination;
  tripDateFrom: string;
  groupInfo: { adults: number; children_ages: number[] };
}): Promise<{
  todo: GeneratedPreTripTodo;
  usage: { input_tokens: number; output_tokens: number };
}> {
  const systemPrompt = `Jesteś asystentem podróży specjalizującym się w przygotowaniach pre-trip.
Generujesz listę zadań do zrobienia PRZED wyjazdem, posortowaną po czasie (3 miesiące → dzień wyjazdu).

ZASADY:
- Każde zadanie konkretne, akcjonalne
- "is_critical: true" tylko dla rzeczy które rujnują wyjazd jeśli ominięte
- "reason" gdy nieoczywisty
- Spersonalizuj dla destynacji
- destination_specific_warnings: max 5
- NIE wymyślaj wymagań wizowych jeśli nie jesteś pewien - napisz "sprawdź wymagania wizowe na gov.pl/dyplomacja"
- Polski, naturalny, jak doświadczony znajomy radzi.`;

  const userPrompt = `# DESTYNACJA
${destination.name}
Kraj: ${destination.country_code}
Typ: ${destination.destination_type}

# DATA WYJAZDU
${tripDateFrom}

# GRUPA
${groupInfo.adults} dorosłych
Dzieci w wieku: ${groupInfo.children_ages.join(", ") || "brak"}

# ZADANIE
Wygeneruj timeline pre-trip jako structured JSON.
Pomyśl o specyfice kraju, grupy (dzieci → foteliki, leki), typie podróży (UE vs poza UE).
Pamiętaj o klasykach: paszport, ubezpieczenie, check-in online, power bank, bank.`;

  const { data, usage } = await callClaudeJson<GeneratedPreTripTodo>({
    systemPrompt,
    userPrompt,
    maxTokens: 2500,
    temperature: 0.3,
    schema: TODO_SCHEMA,
  });

  return { todo: data, usage };
}

import { callClaudeJson } from "@/lib/api/claude";
import type { Attraction, Destination, WeatherSummary } from "@/types/domain";

export type PackingCategory = {
  category: string;
  items: Array<{ name: string; quantity?: string; reason?: string }>;
};

export type GeneratedPackingList = {
  weather_summary: string;
  categories: PackingCategory[];
  special_notes: string[];
};

const PACKING_SCHEMA = `{
  "weather_summary": "1 zdanie ogólne o pogodzie i jak się ubrać",
  "categories": [
    {
      "category": "Dokumenty | Ubrania | Sport i aktywności | Kosmetyki | Elektronika | Dla dzieci | Inne",
      "items": [
        {"name": "krem 50+ wodoodporny", "quantity": "1 tubka 200ml", "reason": "wysoki UV i sporty wodne"}
      ]
    }
  ],
  "special_notes": ["szczególne uwagi"]
}`;

export async function generatePackingList({
  destination,
  attractions,
  weatherSummary,
  weatherDays,
  groupInfo,
}: {
  destination: Destination;
  attractions: Array<Pick<Attraction, "id" | "name" | "category">>;
  weatherSummary?: WeatherSummary;
  weatherDays?: Array<{
    date: string;
    temp_max: number;
    temp_min: number;
    precipitation_mm: number;
    uv_index_max?: number;
    wind_speed_kmh?: number;
  }>;
  groupInfo: { adults: number; children_ages: number[] };
}): Promise<{
  list: GeneratedPackingList;
  usage: { input_tokens: number; output_tokens: number };
}> {
  const systemPrompt = `Jesteś asystentem do pakowania na wakacje rodzinne. Generujesz spersonalizowaną listę po polsku.

ZASADY:
- Konkretne ilości gdy znane ("krem 200ml", "3 koszulki na osobę", "zapas leków na 7 dni")
- Każdy item ma "reason" gdy nieoczywisty (dlaczego TO konkretnie)
- Grupuj w kategorie - max 7 kategorii
- NIE wymyślaj atrakcji - opieraj się na liście aktywności którą Ci dano
- NIE wymyślaj specyfiki klimatu - opieraj się na podanej pogodzie
- special_notes: max 3
- Język: konkretny, praktyczny. Nie "może warto wziąć" tylko "weź".`;

  const userPrompt = buildPackingPrompt({
    destination,
    attractions,
    weatherSummary,
    weatherDays,
    groupInfo,
  });

  const { data, usage } = await callClaudeJson<GeneratedPackingList>({
    systemPrompt,
    userPrompt,
    maxTokens: 2500,
    temperature: 0.3,
    schema: PACKING_SCHEMA,
  });

  return { list: data, usage };
}

function buildPackingPrompt({
  destination,
  attractions,
  weatherSummary,
  weatherDays,
  groupInfo,
}: Parameters<typeof generatePackingList>[0]): string {
  const sections: string[] = [];

  sections.push(`# DESTYNACJA
${destination.name} (${destination.country_code})
Strefa czasowa: ${destination.timezone}`);

  sections.push(`# GRUPA
${groupInfo.adults} dorosłych
${groupInfo.children_ages.length} dzieci w wieku: ${groupInfo.children_ages.join(", ") || "brak"}`);

  if (weatherSummary) {
    sections.push(`# POGODA - PODSUMOWANIE
Temp średnia max: ${weatherSummary.avg_temp_max}°C
Temp średnia min: ${weatherSummary.avg_temp_min}°C
Opady łącznie: ${weatherSummary.total_precipitation_mm}mm
Deszczowych dni: ${weatherSummary.rainy_days}
Średni UV: ${weatherSummary.avg_uv_index}`);
  }

  if (weatherDays && weatherDays.length > 0) {
    sections.push(`# POGODA PER DZIEŃ (próbka pierwszych 5)
${weatherDays
  .slice(0, 5)
  .map(
    (w) =>
      `${w.date}: ${w.temp_min}-${w.temp_max}°C, opady ${w.precipitation_mm}mm, UV ${w.uv_index_max ?? "?"}, wiatr ${w.wind_speed_kmh ?? "?"} km/h`,
  )
  .join("\n")}`);
  }

  const categories = Array.from(new Set(attractions.map((a) => a.category)));
  sections.push(`# AKTYWNOŚCI ZAPLANOWANE (kategorie)
${categories.join(", ")}

Konkretne atrakcje:
${attractions
  .slice(0, 20)
  .map((a) => `- ${a.name} (${a.category})`)
  .join("\n")}`);

  sections.push(`# ZADANIE
Wygeneruj listę do spakowania jako structured JSON.
Pamiętaj o specyfice aktywności:
- Quady: zamknięte buty, długie spodnie, chusta na usta (kurz)
- Jaskinie: bluzy (jaskinie ~16°C), wodoodporne buty
- Rowery: kask jeśli swój, długie spodnie
- Kajaki/snorkeling: strój kąpielowy zapasowy, ręcznik szybkoschnący, krem wodoodporny
- Wspinaczka: wygodne spodnie, rękawiczki
- Plaża: krem 50+, mata, parawan, czapka

Dostosuj ilości do liczby osób i długości pobytu.`);

  return sections.join("\n\n");
}

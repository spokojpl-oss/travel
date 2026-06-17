import crypto from "node:crypto";
import { callClaudeJson, CLAUDE_MODEL } from "@/lib/api/claude";
import type { GooglePlace } from "@/lib/api/google-places";
import type { WikivoyageDestinationContent } from "@/lib/api/wikivoyage";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildSourceData,
  validateStructuredOutput,
  type ValidationResult,
} from "./anti-hallucination";
import type { Destination } from "@/types/domain";
import type { Json } from "@/types/database";

export type CyclingDestinationSummary = {
  overview: string;
  why_good_for_cycling: string;
  terrain_character: string;
  classic_routes: Array<{ name: string; description: string }>;
  wind_and_weather: string | null;
  road_warnings: string[];
  best_base_towns: Array<{ name: string; reasoning: string }>;
  bike_services_tips: string[];
  season_tips: string[];
  insufficient_data?: boolean;
};

export type CyclingSummaryInput = {
  destination: Destination;
  wikivoyage: WikivoyageDestinationContent | null;
  googlePlaces: GooglePlace[];
  weatherSummary?: object;
  routeCount?: number;
};

const CYCLING_SCHEMA = `{
  "overview": "2-3 zdania: region z perspektywy kolarza, nie rodziny na wakacjach",
  "why_good_for_cycling": "1-2 zdania dlaczego warto tu przyjechać na rower",
  "terrain_character": "krótko: np. górski / płaski / wyspiarski / mieszany",
  "classic_routes": [
    {"name": "nazwa trasy lub pętli", "description": "dystans, charakter, dla kogo"}
  ],
  "wind_and_weather": "wiatr, temperatura w sezonie, deszcz — lub null jeśli brak danych",
  "road_warnings": ["ostrzeżenie o ruchu, braku poboczy, zwierzętach itd."],
  "best_base_towns": [
    {"name": "miejscowość", "reasoning": "dlaczego dobra baza kolarska"}
  ],
  "bike_services_tips": ["wypożyczalnie, serwis, sklepy — praktyczne tipy"],
  "season_tips": ["kiedy jechać, czego unikać sezonowo"],
  "insufficient_data": false
}`;

const FIELDS_TO_VALIDATE = [
  "overview",
  "why_good_for_cycling",
  "terrain_character",
  "wind_and_weather",
  "classic_routes",
  "road_warnings",
  "best_base_towns",
  "bike_services_tips",
  "season_tips",
];

export async function synthesizeCyclingDestination(
  input: CyclingSummaryInput,
): Promise<{
  summary: CyclingDestinationSummary;
  validation: ValidationResult;
  usage: { input_tokens: number; output_tokens: number };
}> {
  const source = buildSourceData({
    wikivoyageText: input.wikivoyage
      ? `${input.wikivoyage.intro} ${Object.values(input.wikivoyage.sections).filter(Boolean).join(" ")}`
      : undefined,
    googlePlaces: input.googlePlaces,
  });

  const userPrompt = buildCyclingPrompt(input);

  const systemPrompt = `Jesteś asystentem dla kolarzy planujących wyjazd rowerowy (szosa, gravel, MTB).
Twoja rola: na podstawie DANYCH ŹRÓDŁOWYCH syntezujesz praktyczne podsumowanie regionu pod kolarstwo.

ZASADY:
1. Piszesz WYŁĄCZNIE dla kolarzy — zero plaż dla dzieci, muzeów rodzinnych, „objazdów z rodziną”.
2. Używasz tylko faktów z dostarczonych danych. Nie wymyślaj tras, których nie ma w źródłach — classic_routes mogą być ogólne („Trasy wzdłuż wybrzeża”) jeśli brak nazw.
3. Skup się na: nawierzchni, przewyższeniach, wietrze, ruchu, bazach noclegowych blisko tras, serwisie rowerowym.
4. Język polski, konkretny, jak doświadczony kolarz doradza koledze — bez marketingowej papki.
5. Nigdy nie wspominaj Wikivoyage/Wikipedia w tekście dla użytkownika.
6. classic_routes: max 4. road_warnings: max 3. best_base_towns: max 3. bike_services_tips: max 4. season_tips: max 3.
7. Jeśli dane są zbyt ubogie — insufficient_data: true.`;

  const { data, usage } = await callClaudeJson<CyclingDestinationSummary>({
    systemPrompt,
    userPrompt,
    maxTokens: 2500,
    temperature: 0.3,
    schema: CYCLING_SCHEMA,
  });

  const validation = validateStructuredOutput(
    data as unknown as Record<string, unknown>,
    source,
    FIELDS_TO_VALIDATE,
  );

  return { summary: data, validation, usage };
}

function buildCyclingPrompt(input: CyclingSummaryInput): string {
  const sections: string[] = [];

  sections.push(`# REGION ROWEROWY
Nazwa: ${input.destination.name}
Kraj: ${input.destination.country_code}
Typ: ${input.destination.destination_type}`);

  if (input.routeCount != null && input.routeCount > 0) {
    sections.push(`# TRASY W BAZIE
W systemie zapisano ${input.routeCount} tras rowerowych dla tej destynacji.`);
  }

  if (input.weatherSummary) {
    sections.push(`# POGODA (Open-Meteo)
${JSON.stringify(input.weatherSummary, null, 2)}`);
  }

  if (input.wikivoyage) {
    sections.push(`# DANE Z WIKIVOYAGE
Intro: ${input.wikivoyage.intro}
${Object.entries(input.wikivoyage.sections)
  .filter(([, content]) => content)
  .map(([key, content]) => `## ${key}\n${content}`)
  .join("\n\n")}`);
  }

  if (input.googlePlaces.length > 0) {
    sections.push(`# MIEJSCA (Google — wypożyczalnie, serwisy, bazy)
${input.googlePlaces
  .slice(0, 15)
  .map(
    (p) =>
      `- ${p.name}${p.rating != null ? ` (${p.rating})` : ""}${p.editorial_summary ? `: ${p.editorial_summary}` : ""}`,
  )
  .join("\n")}`);
  }

  sections.push(`# ZADANIE
Wygeneruj podsumowanie regionu dla kolarza według schematu. Bez treści rodzinnych.`);

  return sections.join("\n\n");
}

export function buildCyclingContextHash(): string {
  return crypto
    .createHash("sha256")
    .update("cycling:v1")
    .digest("hex")
    .substring(0, 16);
}

export async function getOrCreateCyclingDestinationSummary(
  input: CyclingSummaryInput,
): Promise<{
  summary: CyclingDestinationSummary;
  fromCache: boolean;
  validation?: ValidationResult;
  contextHash: string;
}> {
  const supabase = createAdminClient();
  const contextHash = `cy-${buildCyclingContextHash()}`;

  const { data: cached } = await supabase
    .from("destination_summaries")
    .select("*")
    .eq("destination_id", input.destination.id)
    .eq("context_hash", contextHash)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (cached) {
    return {
      summary: cached.summary as unknown as CyclingDestinationSummary,
      fromCache: true,
      contextHash,
    };
  }

  const { summary, validation, usage } =
    await synthesizeCyclingDestination(input);

  const finalSummary: CyclingDestinationSummary = validation.valid
    ? summary
    : {
        ...summary,
        road_warnings: [
          ...summary.road_warnings,
          "Niektóre dane mogą być niepełne — zweryfikuj przed wyjazdem.",
        ],
      };

  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  await supabase.from("destination_summaries").upsert({
    destination_id: input.destination.id,
    context_hash: contextHash,
    selected_activities: ["cycling"],
    family_profile_summary: null,
    summary: finalSummary as unknown as Json,
    model_used: CLAUDE_MODEL,
    tokens_used: usage as unknown as Json,
    expires_at: expiresAt,
  });

  return {
    summary: finalSummary,
    fromCache: false,
    validation,
    contextHash,
  };
}

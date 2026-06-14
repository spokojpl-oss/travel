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
import type { Attraction, Destination } from "@/types/domain";
import type { Json } from "@/types/database";

export type DestinationSummaryInput = {
  destination: Destination;
  selectedActivities: string[];
  attractions: Attraction[];
  allAttractions: Attraction[];
  wikivoyage: WikivoyageDestinationContent | null;
  googlePlaces: GooglePlace[];
  weatherSummary?: object;
  familyProfile?: {
    adults: number;
    children_ages: number[];
    travel_style: string;
    notes?: string;
  };
};

export type DestinationSummary = {
  overview: string;
  why_matches_query: string;
  highlights: Array<{
    title: string;
    description: string;
    source: "wikivoyage" | "attractions" | "google_places";
  }>;
  transport_summary: string | null;
  local_tips: string[];
  warnings: string[];
  best_areas_to_stay: Array<{
    area_name: string;
    reasoning: string;
  }>;
  insufficient_data?: boolean;
};

const SUMMARY_SCHEMA = `{
  "overview": "2-3 zdania ogólnego opisu destynacji",
  "why_matches_query": "1-2 zdania dlaczego ta destynacja pasuje do wybranych aktywności",
  "highlights": [
    {"title": "...", "description": "...", "source": "wikivoyage|attractions|google_places"}
  ],
  "transport_summary": "1-2 zdania o transporcie z lotniska / poruszaniu się | null",
  "local_tips": ["tip 1", "tip 2"],
  "warnings": ["warning 1"],
  "best_areas_to_stay": [
    {"area_name": "...", "reasoning": "..."}
  ],
  "insufficient_data": false
}`;

const FIELDS_TO_VALIDATE = [
  "overview",
  "why_matches_query",
  "transport_summary",
  "highlights",
  "local_tips",
  "warnings",
  "best_areas_to_stay",
];

export async function synthesizeDestination(
  input: DestinationSummaryInput,
): Promise<{
  summary: DestinationSummary;
  validation: ValidationResult;
  usage: { input_tokens: number; output_tokens: number };
}> {
  const source = buildSourceData({
    wikivoyageText: input.wikivoyage
      ? `${input.wikivoyage.intro} ${Object.values(input.wikivoyage.sections).filter(Boolean).join(" ")}`
      : undefined,
    attractions: input.allAttractions,
    googlePlaces: input.googlePlaces,
  });

  const userPrompt = buildSynthesisPrompt(input);

  const systemPrompt = `Jesteś asystentem pomagającym planować podróże dla polskich rodzin.
Twoja rola: na podstawie dostarczonych DANYCH ŹRÓDŁOWYCH (Wikivoyage, atrakcje z OSM, Google Places, pogoda) - syntezujesz strukturalne podsumowanie destynacji.

ZASADY:
1. Używasz WYŁĄCZNIE faktów z dostarczonych danych.
2. Jeśli nie ma informacji o transporcie - transport_summary = null.
3. NIE wymyślasz nazw, cen, telefonów, linków których nie ma w danych.
4. Nazwy własne (hotele, firmy) cytujesz dokładnie tak jak w danych źródłowych.
5. Język polski. Naturalny, nie napuszony. Jak człowiek do rodziny, nie jak broszura turystyczna.
6. Highlights: max 5, każdy ma source skąd pochodzi.
7. Local_tips: praktyczne, konkretne. Nie "warto zobaczyć", tylko "weź gotówkę bo karty nie działają w XYZ".
8. Warnings: max 3, tylko ważne (bezpieczeństwo, prawne, sezonowość).
9. Best_areas_to_stay: max 3 obszary, każdy z konkretnym uzasadnieniem.

Jeśli dane są zbyt ubogie żeby zrobić sensowne podsumowanie - ustaw insufficient_data: true.`;

  const { data, usage } = await callClaudeJson<DestinationSummary>({
    systemPrompt,
    userPrompt,
    maxTokens: 2500,
    temperature: 0.3,
    schema: SUMMARY_SCHEMA,
  });

  const validation = validateStructuredOutput(
    data as unknown as Record<string, unknown>,
    source,
    FIELDS_TO_VALIDATE,
  );

  return { summary: data, validation, usage };
}

function buildSynthesisPrompt(input: DestinationSummaryInput): string {
  const sections: string[] = [];

  sections.push(`# DESTYNACJA
Nazwa: ${input.destination.name}
Kraj: ${input.destination.country_code}
Typ: ${input.destination.destination_type}
Strefa czasowa: ${input.destination.timezone}`);

  sections.push(`# WYBRANE AKTYWNOŚCI UŻYTKOWNIKA
${input.selectedActivities.join(", ")}`);

  if (input.familyProfile) {
    sections.push(`# PROFIL PODRÓŻNIKA
Dorośli: ${input.familyProfile.adults}
Wiek dzieci: ${input.familyProfile.children_ages.join(", ") || "brak dzieci"}
Styl: ${input.familyProfile.travel_style}
${input.familyProfile.notes ? `Notatki: ${input.familyProfile.notes}` : ""}`);
  }

  if (input.weatherSummary) {
    sections.push(`# POGODA (Open-Meteo)
${JSON.stringify(input.weatherSummary, null, 2)}`);
  }

  if (input.wikivoyage) {
    sections.push(`# DANE Z WIKIVOYAGE
Tytuł: ${input.wikivoyage.title}
Intro: ${input.wikivoyage.intro}

Sekcje:
${Object.entries(input.wikivoyage.sections)
  .filter(([, content]) => content)
  .map(([key, content]) => `## ${key}\n${content}`)
  .join("\n\n")}`);
  }

  if (input.attractions.length > 0) {
    sections.push(`# ATRAKCJE PASUJĄCE DO WYBRANYCH AKTYWNOŚCI (${input.attractions.length})
${input.attractions
  .slice(0, 30)
  .map(
    (a) =>
      `- ${a.name} (${a.category}, ${Number(a.lat).toFixed(3)}, ${Number(a.lon).toFixed(3)})${a.address ? `, ${a.address}` : ""}`,
  )
  .join("\n")}`);
  }

  if (input.googlePlaces.length > 0) {
    sections.push(`# GOOGLE PLACES - WAŻNE MIEJSCA (${input.googlePlaces.length})
${input.googlePlaces
  .slice(0, 20)
  .map(
    (p) =>
      `- ${p.name} (rating: ${p.rating ?? "b/d"}, ${p.rating_count ?? 0} opinii)${p.address ? `\n  Adres: ${p.address}` : ""}${p.editorial_summary ? `\n  Opis: ${p.editorial_summary}` : ""}`,
  )
  .join("\n")}`);
  }

  sections.push(`# ZADANIE
Wygeneruj strukturalne podsumowanie destynacji według podanego schematu.
PAMIĘTAJ: tylko fakty z powyższych danych. Nie wymyślaj.`);

  return sections.join("\n\n");
}

export function buildContextHash(
  selectedActivities: string[],
  familyProfile?: DestinationSummaryInput["familyProfile"],
): string {
  const data = {
    activities: [...selectedActivities].sort(),
    profile: familyProfile
      ? {
          adults: familyProfile.adults,
          children_ages: [...familyProfile.children_ages].sort(),
          travel_style: familyProfile.travel_style,
        }
      : null,
  };
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex")
    .substring(0, 16);
}

export async function getOrCreateDestinationSummary(
  input: DestinationSummaryInput,
): Promise<{
  summary: DestinationSummary;
  fromCache: boolean;
  validation?: ValidationResult;
  contextHash: string;
}> {
  const supabase = createAdminClient();
  const contextHash = buildContextHash(
    input.selectedActivities,
    input.familyProfile,
  );

  const { data: cached } = await supabase
    .from("destination_summaries")
    .select("*")
    .eq("destination_id", input.destination.id)
    .eq("context_hash", contextHash)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (cached) {
    return {
      summary: cached.summary as unknown as DestinationSummary,
      fromCache: true,
      contextHash,
    };
  }

  const { summary, validation, usage } = await synthesizeDestination(input);

  const finalSummary: DestinationSummary = validation.valid
    ? summary
    : {
        ...summary,
        warnings: [
          ...summary.warnings,
          "⚠️ Niektóre dane mogą być niepełne",
        ],
      };

  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  await supabase.from("destination_summaries").upsert({
    destination_id: input.destination.id,
    context_hash: contextHash,
    selected_activities: input.selectedActivities,
    family_profile_summary: (input.familyProfile ?? null) as Json,
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

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildTripComparison } from "@/lib/compare/trip-comparison";
import { callClaudeJson } from "@/lib/api/claude";
import { apiEnv } from "@/config/api-env";

export const dynamic = "force-dynamic";

const schema = z.object({
  trip_ids: z.array(z.string().uuid()).min(2).max(3),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation" }, { status: 400 });
  }

  const { data: ownedTrips } = await supabase
    .from("trips")
    .select("id")
    .in("id", parsed.data.trip_ids)
    .eq("user_id", user.id);

  if (!ownedTrips || ownedTrips.length !== parsed.data.trip_ids.length) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!apiEnv.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY nie skonfigurowany" },
      { status: 503 },
    );
  }

  const comparison = await buildTripComparison(parsed.data.trip_ids);

  const { data, usage } = await callClaudeJson<{
    verdict: string;
    trade_offs: string[];
  }>({
    systemPrompt: `Analizujesz porównanie ${comparison.length} wariantów wakacji i rekomendujesz wybór.

ZASADY:
- Używasz TYLKO danych z porównania
- Konkretne liczby z danych: "Madera tańsza o 600 PLN", nie "Madera jest tania"
- Verdict: 3-5 zdań po polsku
- trade_offs: 3 najważniejsze ustępstwa (czego każda opcja Cię pozbawia)
- NIE wymyślaj cech destynacji których nie ma w danych`,
    userPrompt: `# OPCJE DO PORÓWNANIA
${comparison
  .map(
    (c) => `
## ${c.name} (${c.destination_name}, ${c.country_code})
Daty: ${c.date_from} → ${c.date_to} (${c.nights} nocy)
Lot min: ${c.metrics.flight_min_pln ?? "?"} PLN
Hotel total: ${c.metrics.hotel_total_pln ?? "?"} PLN (${c.metrics.hotel_per_night_pln ?? "?"} PLN/noc)
Real total: ${c.metrics.real_total_cost_pln ?? "?"} PLN
Lot bezpośredni: ${c.metrics.direct_flight_available ? "TAK" : "NIE"}
Średnia max temp: ${c.metrics.weather_temp_max_avg ?? "?"}°C
Dni deszczowych: ${c.metrics.weather_rainy_days ?? "?"}
Atrakcji: ${c.metrics.attractions_count}
Porady krytyczne: ${c.metrics.advisories_count.critical}, ostrzeżenia: ${c.metrics.advisories_count.warning}
Top advisory: ${c.metrics.top_advisory_title ?? "brak"}
`,
  )
  .join("\n")}

# ZADANIE
Napisz verdict (3-5 zdań) wybierający najlepszą opcję dla danego profilu.
Plus trade_offs: 3 ustępstwa jakie wybór wymaga.`,
    schema: `{"verdict": "string", "trade_offs": ["..."]}`,
    maxTokens: 800,
    temperature: 0.3,
  });

  return NextResponse.json({
    verdict: data.verdict,
    trade_offs: data.trade_offs,
    usage,
  });
}

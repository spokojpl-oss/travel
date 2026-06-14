import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  searchAirportCatalog,
  type AirportSuggestion,
} from "@/lib/flights/airport-catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? 8), 20);

  if (q.trim().length < 1) {
    return NextResponse.json({
      airports: searchAirportCatalog("", limit),
      source: "catalog",
    });
  }

  const pattern = `%${q.trim()}%`;
  const { data, error } = await supabase
    .from("airports")
    .select("iata_code, name, city, country_code")
    .or(
      `name.ilike.${pattern},city.ilike.${pattern},iata_code.ilike.${pattern}`,
    )
    .eq("scheduled_service", true)
    .order("airport_type", { ascending: true })
    .limit(limit);

  if (error || !data?.length) {
    return NextResponse.json({
      airports: searchAirportCatalog(q, limit),
      source: "catalog",
    });
  }

  const airports: AirportSuggestion[] = data.map((row) => ({
    iata: row.iata_code,
    name: row.name,
    city: row.city,
    country_code: row.country_code,
  }));

  return NextResponse.json({ airports, source: "database" });
}

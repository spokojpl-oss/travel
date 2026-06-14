/**
 * Pobiera CSV z OurAirports, filtruje sensowne lotniska, zapisuje do Supabase.
 * Uruchom: pnpm seed:airports
 */

import { createClient } from "@supabase/supabase-js";

const OURAIRPORTS_CSV =
  "https://davidmegginson.github.io/ourairports-data/airports.csv";

type CsvRow = Record<string, string>;

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Ustaw NEXT_PUBLIC_SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY w .env.local",
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("Fetching OurAirports CSV...");
  const res = await fetch(OURAIRPORTS_CSV);
  const text = await res.text();
  const rows = parseCsv(text);

  console.log(`Total rows: ${rows.length}`);

  const filtered = rows.filter((r) => {
    const iata = r.iata_code?.trim();
    if (!iata || iata.length !== 3) return false;
    if (r.scheduled_service !== "yes") return false;
    const type = r.type;
    if (!["large_airport", "medium_airport", "small_airport"].includes(type)) {
      return false;
    }
    return true;
  });

  console.log(`Filtered (with IATA + scheduled service): ${filtered.length}`);

  const typeMap: Record<string, string> = {
    large_airport: "large",
    medium_airport: "medium",
    small_airport: "small",
  };

  const airports = filtered.map((r) => ({
    iata_code: r.iata_code.trim(),
    icao_code: r.ident?.trim() || null,
    name: r.name?.trim() || "",
    city: r.municipality?.trim() || null,
    country_code: r.iso_country?.trim() || "",
    lat: parseFloat(r.latitude_deg),
    lon: parseFloat(r.longitude_deg),
    airport_type: typeMap[r.type] ?? "small",
    scheduled_service: true,
    timezone: null,
  }));

  const batchSize = 500;
  let inserted = 0;
  for (let i = 0; i < airports.length; i += batchSize) {
    const batch = airports.slice(i, i + batchSize);
    const { error } = await supabase
      .from("airports")
      .upsert(batch, { onConflict: "iata_code" });

    if (error) {
      console.error(`Batch ${i / batchSize} failed:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${airports.length}`);
    }
  }

  console.log("Done!");
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.split("\n");
  const headers = parseCsvLine(lines[0]);
  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = parseCsvLine(line);
      const row: CsvRow = {};
      headers.forEach((h, i) => {
        row[h] = values[i] ?? "";
      });
      return row;
    });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

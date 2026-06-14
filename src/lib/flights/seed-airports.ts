import { createAdminClient } from "@/lib/supabase/admin";
import type { AirportSize } from "@/types/domain";
import type { Database } from "@/types/database";

const OURAIRPORTS_CSV =
  "https://davidmegginson.github.io/ourairports-data/airports.csv";

type CsvRow = Record<string, string>;

export type SeedAirportsResult = {
  total_csv_rows: number;
  filtered: number;
  inserted: number;
  failed_batches: number;
};

export async function seedAirportsFromOurAirports(): Promise<SeedAirportsResult> {
  const supabase = createAdminClient();

  const res = await fetch(OURAIRPORTS_CSV);
  if (!res.ok) {
    throw new Error(`Failed to fetch OurAirports CSV: ${res.status}`);
  }

  const text = await res.text();
  const rows = parseCsv(text);

  const filtered = rows.filter((r) => {
    const iata = r.iata_code?.trim();
    if (!iata || iata.length !== 3) return false;
    if (r.scheduled_service !== "yes") return false;
    if (!["large_airport", "medium_airport", "small_airport"].includes(r.type)) {
      return false;
    }
    return true;
  });

  const typeMap: Record<string, AirportSize> = {
    large_airport: "large",
    medium_airport: "medium",
    small_airport: "small",
  };

  type AirportInsert = Database["public"]["Tables"]["airports"]["Insert"];

  const airports: AirportInsert[] = filtered.map((r) => ({
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
  let failedBatches = 0;

  for (let i = 0; i < airports.length; i += batchSize) {
    const batch = airports.slice(i, i + batchSize);
    const { error } = await supabase
      .from("airports")
      .upsert(batch, { onConflict: "iata_code" });

    if (error) {
      failedBatches++;
      throw new Error(`Batch ${i / batchSize} failed: ${error.message}`);
    }
    inserted += batch.length;
  }

  return {
    total_csv_rows: rows.length,
    filtered: airports.length,
    inserted,
    failed_batches: failedBatches,
  };
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
      headers.forEach((h, idx) => {
        row[h] = values[idx] ?? "";
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

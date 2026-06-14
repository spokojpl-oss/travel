/**
 * Generuje supabase/seeds/airports.sql z OurAirports CSV.
 * Nie wymaga kluczy Supabase.
 */
import fs from "node:fs";

const OURAIRPORTS_CSV =
  "https://davidmegginson.github.io/ourairports-data/airports.csv";

const res = await fetch(OURAIRPORTS_CSV);
const text = await res.text();
const lines = text.split("\n");
const headers = parseCsvLine(lines[0]);
const typeMap = {
  large_airport: "large",
  medium_airport: "medium",
  small_airport: "small",
};

const rows = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const values = parseCsvLine(line);
  const r = {};
  headers.forEach((h, idx) => {
    r[h] = values[idx] ?? "";
  });
  const iata = r.iata_code?.trim();
  if (!iata || iata.length !== 3) continue;
  if (r.scheduled_service !== "yes") continue;
  if (!["large_airport", "medium_airport", "small_airport"].includes(r.type)) {
    continue;
  }
  rows.push({
    iata_code: iata,
    icao_code: r.ident?.trim() || null,
    name: r.name?.trim() || "",
    city: r.municipality?.trim() || null,
    country_code: r.iso_country?.trim() || "",
    lat: parseFloat(r.latitude_deg),
    lon: parseFloat(r.longitude_deg),
    airport_type: typeMap[r.type] ?? "small",
  });
}

const esc = (s) => String(s).replace(/'/g, "''");
const chunks = [
  `-- Seed lotnisk z OurAirports (${rows.length} rekordów)`,
  "-- Uruchom w Supabase SQL Editor po migracji 009",
  "",
];

const batchSize = 200;
for (let i = 0; i < rows.length; i += batchSize) {
  const batch = rows.slice(i, i + batchSize);
  const values = batch
    .map(
      (a) =>
        `('${esc(a.iata_code)}','${esc(a.icao_code || "")}','${esc(a.name)}','${esc(a.city || "")}','${esc(a.country_code)}',${a.lat},${a.lon},'${a.airport_type}',true)`,
    )
    .join(",\n  ");
  chunks.push(
    "insert into airports (iata_code, icao_code, name, city, country_code, lat, lon, airport_type, scheduled_service)",
    "values",
    `  ${values}`,
    "on conflict (iata_code) do update set",
    "  name = excluded.name, city = excluded.city, lat = excluded.lat, lon = excluded.lon, airport_type = excluded.airport_type;",
    "",
  );
}

fs.writeFileSync("supabase/seeds/airports.sql", chunks.join("\n"));
console.log(`Written ${rows.length} airports to supabase/seeds/airports.sql`);

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else current += char;
  }
  result.push(current);
  return result;
}

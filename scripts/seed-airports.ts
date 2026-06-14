/**
 * Pobiera CSV z OurAirports i zapisuje do Supabase.
 * Uruchom: pnpm seed:airports
 *
 * Wymaga prawdziwych kluczy w .env.local (nie placeholdery).
 * Alternatywa bez lokalnego env: POST /api/admin/seed-airports na produkcji (jako admin).
 */

import { seedAirportsFromOurAirports } from "../src/lib/flights/seed-airports";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Ustaw NEXT_PUBLIC_SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY w .env.local",
    );
  }

  if (/twoj-projekt|your-project|example/i.test(supabaseUrl)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL to placeholder.\n" +
        "Opcja A: wklej klucze z Vercel do .env.local\n" +
        "Opcja B: uruchom POST https://travel.mpai.pl/api/admin/seed-airports (zalogowany jako admin)\n" +
        "Opcja C: wklej supabase/seeds/airports.sql w Supabase SQL Editor",
    );
  }

  if (!supabaseKey.startsWith("eyJ")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY wygląda na placeholder (musi zaczynać się od eyJ).",
    );
  }

  console.log(`Supabase: ${new URL(supabaseUrl).hostname}`);
  const result = await seedAirportsFromOurAirports();
  console.log("Done!", result);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

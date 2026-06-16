/**
 * Seed klimatu (Open-Meteo) i budżetu (Eurostat HICP / World Bank) dla europejskich destynacji.
 *
 * Uruchom: pnpm seed:europe
 * Opcje:
 *   --climate-only     tylko klimat (bez budżetu)
 *   --force            wymuś odświeżenie cache API
 *   --slug=ateny-grecja   pojedynczy profil
 *
 * Budżet: darmowe źródła (Eurostat + World Bank). Numbeo NIE jest wymagane.
 */

import { getEuropeDestinationProfiles } from "../src/lib/destinations/europe-profiles";
import { seedEuropeDestinationProfiles } from "../src/lib/destinations/seed-europe-profiles";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Ustaw NEXT_PUBLIC_SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY w .env.local",
    );
  }

  if (/twoj-projekt|your-project|example/i.test(supabaseUrl)) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL to placeholder — wklej klucze z Supabase.");
  }

  const climateOnly = process.argv.includes("--climate-only");
  const forceRefresh = process.argv.includes("--force");
  const slugArg = process.argv.find((a) => a.startsWith("--slug="));
  const slugs = slugArg
    ? [slugArg.replace("--slug=", "").trim()]
    : undefined;

  const allProfiles = getEuropeDestinationProfiles();
  console.log(`Supabase: ${new URL(supabaseUrl).hostname}`);
  console.log(
    `Profile europejskie: ${slugs ? slugs.length : allProfiles.length}` +
      (climateOnly ? " (tylko klimat)" : " (klimat + budżet z Eurostat)"),
  );

  const result = await seedEuropeDestinationProfiles({
    slugs,
    skipBudget: climateOnly,
    forceRefresh,
    delayMs: 600,
  });

  console.log("\nWynik seed:", {
    profiles: result.profiles_total,
    new_destinations: result.destinations_created,
    climate_rows: result.climate_rows,
    budget_rows: result.budget_rows,
    errors: result.errors.length,
  });

  if (result.errors.length > 0) {
    console.log("\nBłędy (pierwsze 10):");
    for (const err of result.errors.slice(0, 10)) {
      console.log(`- ${err.slug} [${err.step}]: ${err.message}`);
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

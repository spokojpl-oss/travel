/**
 * Uruchom scrape OSM lokalnie (omija limit Vercel).
 * Uruchom: pnpm scrape:osm
 * Opcje: pnpm scrape:osm -- --bbox="Poland + neighbors"
 */

import {
  performGlobalOsmScrape,
  tagAttractionsWithActivities,
} from "../src/lib/api/osm-global-scrape";
import { EUROPE_SCRAPE_REGIONS } from "../src/lib/api/osm-scrape-regions";

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
      "NEXT_PUBLIC_SUPABASE_URL to placeholder — wklej klucze z Vercel/Supabase.",
    );
  }

  if (!supabaseKey.startsWith("eyJ")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY wygląda na placeholder (musi zaczynać się od eyJ).",
    );
  }

  const bboxArg = process.argv.find((a) => a.startsWith("--bbox="));
  const europe = process.argv.includes("--europe");
  const bboxFilter = bboxArg
    ? [bboxArg.replace("--bbox=", "").trim()]
    : europe
      ? [...EUROPE_SCRAPE_REGIONS]
      : undefined;

  console.log(`Supabase: ${new URL(supabaseUrl).hostname}`);
  console.log(
    bboxFilter
      ? `Scrape region: ${bboxFilter.join(", ")}`
      : "Scrape: wszystkie regiony",
  );

  const scrape = await performGlobalOsmScrape({
    bboxFilter,
    delayBetweenRequestsMs: 1200,
  });

  console.log("\nScrape:", {
    fetched: scrape.total_fetched,
    persisted: scrape.total_persisted,
    errors: scrape.errors.length,
  });

  if (scrape.errors.length > 0) {
    console.log("\nBłędy (pierwsze 5):");
    for (const err of scrape.errors.slice(0, 5)) {
      console.log(`- ${err.bbox} / ${err.category}: ${err.error}`);
    }
  }

  const tagging = await tagAttractionsWithActivities();
  console.log("\nTagging:", tagging);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Scrape OSM dla regionów turystycznych Portugalii + opcjonalnie cały bbox Iberii.
 *
 * npm run seed:tourist-regions   — najpierw, jeśli nowe seedy PT nie są w bazie
 * npm run scrape:portugal        — puste regiony PT
 * npm run scrape:portugal -- --all — wszystkie regiony PT (wymuszenie)
 * npm run scrape:portugal -- --iberia — dodatkowo bbox Iberia + Madeira + Azory
 */

import {
  performGlobalOsmScrape,
  tagAttractionsWithActivities,
} from "../src/lib/api/osm-global-scrape";
import {
  filterTouristRegionsByCountry,
  listTouristRegionScrapeStatus,
  scrapeTouristRegionOsm,
} from "../src/lib/api/tourist-region-osm-scrape";

function assertEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Ustaw NEXT_PUBLIC_SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY w .env.local",
    );
  }
}

async function main() {
  assertEnv();

  const fillAll = process.argv.includes("--all");
  const includeIberia = process.argv.includes("--iberia");

  const allRegions = await listTouristRegionScrapeStatus();
  const ptRegions = filterTouristRegionsByCountry(allRegions, "portugal");
  const toScrape = fillAll
    ? ptRegions
    : ptRegions.filter((r) => r.needsScrape);

  console.log(`\n=== Portugalia — regiony turystyczne ===`);
  console.log(`Regionów PT w katalogu: ${ptRegions.length}`);
  console.log(`Do scrape: ${toScrape.length}${fillAll ? " (wszystkie)" : " (puste)"}\n`);

  if (toScrape.length === 0) {
    console.log("Brak pustych regionów PT — użyj --all aby wymusić.");
  } else {
    for (let i = 0; i < toScrape.length; i++) {
      const region = toScrape[i]!;
      console.log(
        `[${i + 1}/${toScrape.length}] ${region.name_pl} (${region.id}) — ${region.attractions} atrakcji przed…`,
      );
      const result = await scrapeTouristRegionOsm(region.id);
      console.log(
        `  → +${result.persisted} zapisanych, ${result.tagged} otagowanych (${result.attractionsBefore} → ${result.attractionsAfter})`,
      );
    }
  }

  if (includeIberia) {
    console.log("\n=== Iberia + Madeira + Canary (bbox) ===");
    const scrape = await performGlobalOsmScrape({
      bboxFilter: ["Iberia + Madeira + Canary"],
      delayBetweenRequestsMs: 1400,
    });
    console.log(scrape);
  }

  console.log("\n=== Tagowanie aktywności (globalne) ===");
  const tagging = await tagAttractionsWithActivities();
  console.log(tagging);

  console.log("\nGotowe.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

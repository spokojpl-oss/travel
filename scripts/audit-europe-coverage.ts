/**
 * Audyt pokrycia OSM dla destynacji europejskich + opcjonalne uzupełnienie.
 *
 * npm run audit:osm              — raport
 * npm run audit:osm -- --fill    — scrape pustych regionów Europy + tagging
 * npm run audit:osm -- --fill-all — scrape wszystkich regionów Europy (wymuszenie)
 */

import {
  performGlobalOsmScrape,
  tagAttractionsWithActivities,
} from "../src/lib/api/osm-global-scrape";
import {
  buildOsmCoverageReport,
  EUROPE_SCRAPE_REGIONS,
} from "../src/lib/api/osm-coverage-audit";

function assertEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Ustaw NEXT_PUBLIC_SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY w .env.local",
    );
  }

  if (/twoj-projekt|your-project|example/i.test(supabaseUrl)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL to placeholder — wklej klucze z Supabase/Vercel do .env.local",
    );
  }

  if (!supabaseKey.startsWith("eyJ")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY wygląda na placeholder (musi zaczynać się od eyJ).",
    );
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "ok":
      return "OK";
    case "sparse":
      return "MAŁO";
    case "empty":
      return "PUSTE";
    case "untagged":
      return "BEZ TAGÓW";
    default:
      return status;
  }
}

async function main() {
  assertEnv();

  const fill = process.argv.includes("--fill");
  const fillAll = process.argv.includes("--fill-all");

  console.log(`Supabase: ${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname}\n`);

  const report = await buildOsmCoverageReport();

  console.log("=== Baza (globalnie) ===");
  console.log(`Atrakcje: ${report.totals.attractions}`);
  console.log(`Tagi aktywności: ${report.totals.tags}\n`);

  console.log("=== Destynacje katalogu ===");
  for (const d of report.destinations) {
    console.log(
      `${statusLabel(d.status).padEnd(10)} ${d.name} (${d.country}) — ${d.attractions} atrakcji, ${d.tags} tagów` +
        (d.region ? ` [${d.region}]` : ""),
    );
  }

  console.log("\n=== Regiony scrape (Europa) ===");
  for (const r of report.europeRegions) {
    const flag = r.needsScrape ? "← DO UZUPEŁNIENIA" : "OK";
    console.log(
      `${r.name}: ${r.attractions} atrakcji, ${r.taggedAttractions} z tagami (${r.tags} tagów) ${flag}`,
    );
  }

  const regionsToFill = fillAll
    ? [...EUROPE_SCRAPE_REGIONS]
    : report.regionsNeedingScrape;

  console.log("\n=== Podsumowanie ===");
  console.log(
    `Puste destynacje (${report.emptyDestinations.length}): ${report.emptyDestinations.join(", ") || "—"}`,
  );
  console.log(
    `Regiony do scrape: ${regionsToFill.length ? regionsToFill.join(", ") : "wszystkie OK"}`,
  );

  if (!fill && !fillAll) {
    console.log("\nAby uzupełnić puste regiony: npm run audit:osm -- --fill");
    return;
  }

  if (regionsToFill.length === 0) {
    console.log("\nWszystkie europejskie regiony mają wystarczające dane.");
    if (report.totals.tags === 0 && report.totals.attractions > 0) {
      console.log("Uruchamiam samo tagowanie…");
      const tagging = await tagAttractionsWithActivities();
      console.log(tagging);
    }
    return;
  }

  console.log(`\n=== Scrape OSM (${regionsToFill.length} regionów) ===`);
  console.log("To może potrwać 30–90 min. Nie przerywaj procesu.\n");

  const scrape = await performGlobalOsmScrape({
    bboxFilter: regionsToFill,
    delayBetweenRequestsMs: 1400,
  });

  console.log("\nScrape:", {
    fetched: scrape.total_fetched,
    persisted: scrape.total_persisted,
    errors: scrape.errors.length,
  });

  if (scrape.errors.length > 0) {
    console.log("\nBłędy (pierwsze 8):");
    for (const err of scrape.errors.slice(0, 8)) {
      console.log(`- ${err.bbox} / ${err.category}: ${err.error}`);
    }
  }

  console.log("\n=== Tagowanie aktywności ===");
  const tagging = await tagAttractionsWithActivities();
  console.log(tagging);

  console.log("\n=== Po uzupełnieniu ===");
  const after = await buildOsmCoverageReport();
  for (const d of after.destinations.filter((x) => x.status !== "ok")) {
    console.log(
      `${statusLabel(d.status).padEnd(10)} ${d.name} — ${d.attractions} atrakcji, ${d.tags} tagów`,
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

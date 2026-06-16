import { discoverDestination } from "../src/lib/search/destination-discover";
import { searchActivities } from "../src/lib/search/activity-search";

async function main() {
  const label = process.argv[2] ?? "Lanzarote, Hiszpania";
  const lat = Number(process.argv[3] ?? 28.963);
  const lon = Number(process.argv[4] ?? -13.5477);

  const d0 = Date.now();
  await discoverDestination({
    destinationLabel: label,
    lat,
    lon,
    dateFrom: "2026-08-01",
    dateTo: "2026-08-15",
    explorationScope: "island",
    locale: "pl",
    passengers: "2 dorosłych, 2 dzieci (13 lat, 11 lat)",
  });
  console.log("discover ms", Date.now() - d0);

  const s0 = Date.now();
  await searchActivities({
    activities: ["sandy_beaches", "viewpoints", "museums", "archaeology"],
    match_mode: "any",
    max_radius_km: 15,
    min_per_activity: 1,
    near_lat: lat,
    near_lon: lon,
    near_radius_km: 120,
    exploration_scope: "island",
    destination_label: label,
  });
  console.log("search ms", Date.now() - s0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

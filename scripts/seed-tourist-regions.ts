import { seedTouristRegionsFromDefaults } from "@/lib/destinations/tourist-regions-store";

async function main() {
  const result = await seedTouristRegionsFromDefaults();
  console.log(
    `Seeded ${result.upserted} tourist regions` +
      (result.skipped > 0 ? ` (${result.skipped} duplicate entries skipped).` : "."),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

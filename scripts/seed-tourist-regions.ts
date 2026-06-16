import { seedTouristRegionsFromDefaults } from "@/lib/destinations/tourist-regions-store";

async function main() {
  const result = await seedTouristRegionsFromDefaults();
  console.log(`Seeded ${result.upserted} tourist regions.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

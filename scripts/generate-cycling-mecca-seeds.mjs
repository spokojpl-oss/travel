import fs from "node:fs";
import path from "node:path";
import { CYCLING_MECCA_REGIONS } from "./cycling-mecca-regions-data.mjs";

function esc(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function pickLine(p) {
  const slugs = p[5].map((s) => `"${esc(s)}"`).join(", ");
  return `{ day_theme: "${esc(p[0])}", name_pl: "${esc(p[1])}", name_en: "${esc(p[2])}", why_pl: "${esc(p[3])}", why_en: "${esc(p[4])}", activity_slugs: [${slugs}], rank: ${p[6]} }`;
}

function regionBlock(r) {
  const keys = r.keys.map((k) => `"${esc(k)}"`).join(", ");
  const picks = r.picks.map(pickLine).join(",\n      ");
  return `  {
    id: "${esc(r.id)}",
    destination_keys: [${keys}],
    slug: "${esc(r.slug)}",
    name_pl: "${esc(r.pl)}",
    name_en: "${esc(r.en)}",
    character: "${esc(r.char)}",
    vibe: "${esc(r.vibe)}",
    overview_pl: "${esc(r.ovpl)}",
    overview_en: "${esc(r.oven)}",
    stay_hint_pl: "${esc(r.shpl)}",
    stay_hint_en: "${esc(r.shen)}",
    center_lat: ${r.lat},
    center_lon: ${r.lon},
    picks: [
      ${picks},
    ],
  }`;
}

const outPath = path.join(
  process.cwd(),
  "src/lib/destinations/tourist-regions-seed-cycling-mecca.ts",
);

const header = `import type { TouristRegion } from "./tourist-regions";

/** 50 kolarskich „mek” — legendarne wjazdy, trasy wyścigów i bazy pro teamów. */
export const SEED_TOURIST_REGIONS_CYCLING_MECCA: TouristRegion[] = [
`;

const footer = `];
`;

fs.writeFileSync(
  outPath,
  header + CYCLING_MECCA_REGIONS.map(regionBlock).join(",\n") + footer,
);
console.log(`Wrote ${CYCLING_MECCA_REGIONS.length} mecca regions to ${outPath}`);

import fs from "node:fs";
import path from "node:path";

/** @typedef {{ id: string, keys: string[], slug: string, pl: string, en: string, char: string, vibe: string, lat: number, lon: number, ovpl: string, oven: string, shpl: string, shen: string, picks: [string,string,string,string,string,string[],number][] }} Seed */

function bike(pl, en, wpl, wen, rank = 1) {
  return ["active_outdoor", pl, en, wpl, wen, ["bike_rental", "mountain_biking"], rank];
}

function hike(pl, en, wpl, wen, rank = 2) {
  return ["nature", pl, en, wpl, wen, ["hiking_trails", "viewpoints"], rank];
}

/** @type {Seed[]} */
const REGIONS = [];

function add(seed) {
  REGIONS.push(seed);
}

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

// Regions loaded from data file
import { CYCLING_EUROPE_REGIONS } from "./cycling-europe-regions-data.mjs";
for (const r of CYCLING_EUROPE_REGIONS) add(r);

const outPath = path.join(
  process.cwd(),
  "src/lib/destinations/tourist-regions-seed-cycling-europe.ts",
);

const header = `import type { TouristRegion } from "./tourist-regions";

/** 100 turystycznych regionów rowerowych w Europie — góry, przewody, doliny (ląd + wyspy). */
export const SEED_TOURIST_REGIONS_CYCLING_EUROPE: TouristRegion[] = [
`;

const footer = `];
`;

fs.writeFileSync(outPath, header + REGIONS.map(regionBlock).join(",\n") + footer);
console.log(`Wrote ${REGIONS.length} regions to ${outPath}`);

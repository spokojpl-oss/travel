/**
 * Uzupełnia katalog regionów dla każdej destynacji z DESTINATION_CATALOG.
 * Uruchom: npx tsx scripts/generate-catalog-region-seeds.ts
 */
import fs from "node:fs";
import path from "node:path";
import { DESTINATION_CATALOG } from "../src/lib/destinations/catalog";
import { SEED_TOURIST_REGIONS_RAW } from "../src/lib/destinations/tourist-regions-seed";
import {
  isCyclingTouristRegion,
  regionMatchesDestination,
} from "../src/lib/destinations/tourist-regions";
import type { TouristRegion } from "../src/lib/destinations/tourist-regions";

const MIN_FAMILY_REGIONS = 4;
const MIN_CYCLING_REGIONS = 3;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function esc(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function pickLine(p: {
  day_theme: string;
  name_pl: string;
  name_en: string;
  why_pl: string;
  why_en: string;
  activity_slugs: string[];
  rank: number;
}): string {
  const slugs = p.activity_slugs.map((s) => `"${esc(s)}"`).join(", ");
  return `{ day_theme: "${esc(p.day_theme)}", name_pl: "${esc(p.name_pl)}", name_en: "${esc(p.name_en)}", why_pl: "${esc(p.why_pl)}", why_en: "${esc(p.why_en)}", activity_slugs: [${slugs}], rank: ${p.rank} }`;
}

function regionBlock(r: TouristRegion): string {
  const keys = r.destination_keys.map((k) => `"${esc(k)}"`).join(", ");
  const picks = r.picks.map(pickLine).join(",\n      ");
  const radius =
    r.radius_km != null ? `\n    radius_km: ${r.radius_km},` : "";
  return `  {
    id: "${esc(r.id)}",
    destination_keys: [${keys}],
    slug: "${esc(r.slug)}",
    name_pl: "${esc(r.name_pl)}",
    name_en: "${esc(r.name_en)}",
    character: "${esc(r.character)}",
    vibe: "${esc(r.vibe)}",
    overview_pl: "${esc(r.overview_pl)}",
    overview_en: "${esc(r.overview_en)}",
    stay_hint_pl: "${esc(r.stay_hint_pl)}",
    stay_hint_en: "${esc(r.stay_hint_en)}",
    center_lat: ${r.center_lat},
    center_lon: ${r.center_lon},${radius}
    picks: [
      ${picks},
    ],
  }`;
}

function countryKeys(country: string): string[] {
  const map: Record<string, string[]> = {
    Hiszpania: ["hiszpania", "spain"],
    Portugalia: ["portugalia", "portugal"],
    Grecja: ["grecja", "greece"],
    Chorwacja: ["chorwacja", "croatia"],
    Włochy: ["wlochy", "italy"],
    Francja: ["francja", "france"],
    Turcja: ["turcja", "turkey"],
    Malta: ["malta"],
    Cypr: ["cypr", "cyprus"],
    Albania: ["albania"],
    Norwegia: ["norwegia", "norway"],
    Islandia: ["islandia", "iceland"],
    Czechy: ["czechy", "czechia"],
    Węgry: ["wegry", "hungary"],
    Austria: ["austria"],
    Polska: ["polska", "poland"],
    Szwecja: ["szwecja", "sweden"],
    Tunezja: ["tunezja", "tunisia"],
  };
  return map[country] ?? [slugify(country)];
}

function destinationKeys(name: string, country: string, aliases: string[] = []): string[] {
  const keys = new Set<string>();
  keys.add(slugify(name));
  for (const alias of aliases) keys.add(slugify(alias));
  for (const ck of countryKeys(country)) keys.add(ck);
  return [...keys];
}

function offsetPoint(
  lat: number,
  lon: number,
  dLat: number,
  dLon: number,
): { lat: number; lon: number } {
  return {
    lat: Math.round((lat + dLat) * 1000) / 1000,
    lon: Math.round((lon + dLon) * 1000) / 1000,
  };
}

function isIsland(dest: (typeof DESTINATION_CATALOG)[number]): boolean {
  return Boolean(dest.islandBbox);
}

type VariantKind = "coast" | "center" | "nature" | "cycling-base" | "cycling-hills";

function buildVariant(
  dest: (typeof DESTINATION_CATALOG)[number],
  kind: VariantKind,
  index: number,
): TouristRegion {
  const name = dest.name;
  const nameEn = dest.geocodeQuery?.split(",")[0]?.trim() ?? name;
  const keys = destinationKeys(name, dest.country, dest.aliases ?? []);
  const island = isIsland(dest);
  const step = island ? 0.035 : 0.07;
  const baseLat = dest.lat ?? 0;
  const baseLon = dest.lon ?? 0;

  const offsets: Record<VariantKind, { lat: number; lon: number }> = {
    coast: offsetPoint(baseLat, baseLon, step, 0),
    center: offsetPoint(baseLat, baseLon, 0, 0),
    nature: offsetPoint(baseLat, baseLon, -step * 0.6, step * 0.8),
    "cycling-base": offsetPoint(baseLat, baseLon, step * 0.3, -step * 0.4),
    "cycling-hills": offsetPoint(baseLat, baseLon, -step, step * 0.5),
  };

  const point = offsets[kind];
  const slugBase = slugify(name);

  const familyMeta: Record<
    Exclude<VariantKind, "cycling-base" | "cycling-hills">,
    Omit<TouristRegion, "id" | "slug" | "destination_keys" | "center_lat" | "center_lon">
  > = {
    coast: {
      name_pl: `${name} — wybrzeże`,
      name_en: `${nameEn} — coast`,
      character: "resort",
      vibe: "balanced",
      overview_pl: `Plaże i nadmorska baza w okolicy ${name} — dobre na relaks i krótkie wypady.`,
      overview_en: `Beaches and seaside base near ${nameEn} — good for relaxing and short trips.`,
      stay_hint_pl: `Nad morzem w ${name} — blisko plaży i restauracji.`,
      stay_hint_en: `Seaside in ${nameEn} — close to beaches and restaurants.`,
      picks: [
        {
          day_theme: "beach_relax",
          name_pl: `Plaże ${name}`,
          name_en: `${nameEn} beaches`,
          why_pl: "Kąpiel i spacer brzegiem — codzienny rytm wyjazdu.",
          why_en: "Swimming and coastal walks — daily trip rhythm.",
          activity_slugs: ["sandy_beaches", "rocky_beaches"],
          rank: 1,
        },
        {
          day_theme: "active_outdoor",
          name_pl: "Promenada i port",
          name_en: "Promenade & harbour",
          why_pl: "Wieczorny spacer nad wodą — bez dalekich dojazdów.",
          why_en: "Evening stroll by the water — no long drives.",
          activity_slugs: ["viewpoints", "boat_tour"],
          rank: 2,
        },
      ],
    },
    center: {
      name_pl: `${name} — centrum i baza`,
      name_en: `${nameEn} — centre & base`,
      character: "mixed",
      vibe: "popular",
      overview_pl: `Główna baza w ${name} — infrastruktura, restauracje i łatwy start wycieczek.`,
      overview_en: `Main base in ${nameEn} — infrastructure, food and easy trip starts.`,
      stay_hint_pl: `Centrum ${name} — najwygodniej bez samochodu na miejscu.`,
      stay_hint_en: `${nameEn} centre — easiest without a car on site.`,
      picks: [
        {
          day_theme: "city_culture",
          name_pl: `Stare miasto ${name}`,
          name_en: `${nameEn} old town`,
          why_pl: "Spacer po centrum — kawiarnie, rynek, architektura.",
          why_en: "Centre walk — cafés, market, architecture.",
          activity_slugs: ["old_towns", "museums"],
          rank: 1,
        },
        {
          day_theme: "city_culture",
          name_pl: "Lokalne targi i smaki",
          name_en: "Local markets & food",
          why_pl: "Regionalne produkty — szybki lunch w okolicy.",
          why_en: "Regional produce — quick local lunch.",
          activity_slugs: ["old_towns"],
          rank: 2,
        },
      ],
    },
    nature: {
      name_pl: `${name} — natura i wypady`,
      name_en: `${nameEn} — nature & day trips`,
      character: "wild",
      vibe: "offbeat",
      overview_pl: `Spokojniejsze okolice ${name} — szlaki, widoki i mniej zgiełku niż przy plaży.`,
      overview_en: `Quieter surroundings of ${nameEn} — trails, views, less bustle than the beach.`,
      stay_hint_pl: `Baza poza centrum — auto lub rower na wypady.`,
      stay_hint_en: `Base outside centre — car or bike for day trips.`,
      picks: [
        {
          day_theme: "nature",
          name_pl: "Szlaki i punkty widokowe",
          name_en: "Trails & viewpoints",
          why_pl: "Krótkie trasy z panoramą — idealne na pół dnia.",
          why_en: "Short routes with panoramas — ideal half-day.",
          activity_slugs: ["hiking_trails", "viewpoints"],
          rank: 1,
        },
        {
          day_theme: "active_outdoor",
          name_pl: "Wypad poza szlak turystyczny",
          name_en: "Off-the-beaten path outing",
          why_pl: "Mniej znane miejsca w promieniu jazdy — spokojniejszy dzień.",
          why_en: "Less-known spots within driving range — calmer day.",
          activity_slugs: ["national_parks", "viewpoints"],
          rank: 2,
        },
      ],
    },
  };

  const cyclingMeta: Record<
    "cycling-base" | "cycling-hills",
    Omit<TouristRegion, "id" | "slug" | "destination_keys" | "center_lat" | "center_lon">
  > = {
    "cycling-base": {
      name_pl: `${name} — baza rowerowa`,
      name_en: `${nameEn} — cycling base`,
      character: "mixed",
      vibe: "balanced",
      overview_pl: `Baza kolarska w ${name} — wypożyczalnie, spokojne drogi i starty na dłuższe pętle.`,
      overview_en: `Cycling base in ${nameEn} — rentals, quiet roads and longer loop starts.`,
      stay_hint_pl: `Hotel bike-friendly w ${name} — blisko tras i serwisu.`,
      stay_hint_en: `Bike-friendly stay in ${nameEn} — near routes and service.`,
      picks: [
        {
          day_theme: "active_outdoor",
          name_pl: "Pętla wokół bazy",
          name_en: "Base area loop",
          why_pl: "Regeneracyjna trasa po okolicy — poznanie terenu przed dłuższym dniem.",
          why_en: "Recovery loop nearby — learn the terrain before a big day.",
          activity_slugs: ["bike_rental", "mountain_biking"],
          rank: 1,
        },
        {
          day_theme: "active_outdoor",
          name_pl: "Drogi lokalne bez ruchu",
          name_en: "Quiet local roads",
          why_pl: "Spokojne odcinki idealne na tempo lub grupę.",
          why_en: "Calm sections ideal for tempo or group rides.",
          activity_slugs: ["bike_rental", "mountain_biking"],
          rank: 2,
        },
      ],
    },
    "cycling-hills": {
      name_pl: `${name} — wzniesienia i wypady`,
      name_en: `${nameEn} — climbs & rides`,
      character: "wild",
      vibe: "balanced",
      overview_pl: `Pagórki i wypady rowerowe z ${name} — mix asfaltu i widoków.`,
      overview_en: `Hills and bike outings from ${nameEn} — mix of tarmac and views.`,
      stay_hint_pl: `Baza z dojazdem do wjazdów — warto zaplanować transfer na start.`,
      stay_hint_en: `Base with climb access — plan transfer to starts if needed.`,
      picks: [
        {
          day_theme: "active_outdoor",
          name_pl: "Lokalny wjazd z widokiem",
          name_en: "Local climb with views",
          why_pl: "Krótszy wjazd na rozgrzewkę przed dłuższą trasą.",
          why_en: "Shorter climb for warmup before a longer route.",
          activity_slugs: ["bike_rental", "mountain_biking"],
          rank: 1,
        },
        {
          day_theme: "active_outdoor",
          name_pl: "Dłuższa pętla na cały dzień",
          name_en: "Full-day loop",
          why_pl: "Połączenie wzniesień i zjazdów — klasyczny dzień kolarski.",
          why_en: "Mix of climbs and descents — classic cycling day.",
          activity_slugs: ["bike_rental", "mountain_biking"],
          rank: 2,
        },
      ],
    },
  };

  const isCycling = kind === "cycling-base" || kind === "cycling-hills";
  const meta = isCycling
    ? cyclingMeta[kind]
    : familyMeta[kind as Exclude<VariantKind, "cycling-base" | "cycling-hills">];

  const id = isCycling
    ? `cy-cat-${slugBase}-${kind}`
    : `cat-${slugBase}-${kind}`;

  return {
    id,
    slug: isCycling ? `${slugBase}-${kind}-cycling` : `${slugBase}-${kind}`,
    destination_keys: keys,
    ...meta,
    center_lat: point.lat,
    center_lon: point.lon,
    radius_km: island ? 14 : 22,
  };
}

const generated: TouristRegion[] = [];

for (const dest of DESTINATION_CATALOG) {
  if (dest.lat == null || dest.lon == null) continue;

  const label = `${dest.name}, ${dest.country}`;
  const existing = SEED_TOURIST_REGIONS_RAW.filter((r) =>
    regionMatchesDestination(r, label),
  );
  const existingCycling = existing.filter((r) => isCyclingTouristRegion(r));

  const familyNeeded = Math.max(0, MIN_FAMILY_REGIONS - existing.length);
  const cyclingNeeded = Math.max(0, MIN_CYCLING_REGIONS - existingCycling.length);

  const familyVariants: VariantKind[] = ["center", "coast", "nature"];
  const cyclingVariants: VariantKind[] = ["cycling-base", "cycling-hills"];

  let familyAdded = 0;
  for (const kind of familyVariants) {
    if (familyAdded >= familyNeeded) break;
    const region = buildVariant(dest, kind, familyAdded);
    if (generated.some((g) => g.id === region.id)) continue;
    generated.push(region);
    familyAdded += 1;
  }

  let cyclingAdded = 0;
  for (const kind of cyclingVariants) {
    if (cyclingAdded >= cyclingNeeded) break;
    const region = buildVariant(dest, kind, cyclingAdded);
    if (generated.some((g) => g.id === region.id)) continue;
    generated.push(region);
    cyclingAdded += 1;
  }
}

const outPath = path.join(
  process.cwd(),
  "src/lib/destinations/tourist-regions-seed-catalog.ts",
);

const header = `import type { TouristRegion } from "./tourist-regions";

/** Auto-generated: uzupełnienie regionów dla każdej destynacji z katalogu (min. ${MIN_FAMILY_REGIONS} rodzinnych + ${MIN_CYCLING_REGIONS} kolarskich). */
export const SEED_TOURIST_REGIONS_CATALOG: TouristRegion[] = [
`;

const footer = `];
`;

fs.writeFileSync(
  outPath,
  header + generated.map(regionBlock).join(",\n") + footer,
);

console.log(`Generated ${generated.length} catalog regions → ${outPath}`);

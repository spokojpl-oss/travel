import type { BoundingBox } from "@/types/domain";
import {
  DESTINATION_CATALOG,
  type DestinationSuggestion,
} from "@/lib/destinations/catalog";
import { resolveIslandBoundary } from "@/lib/destinations/island-boundary";
import {
  countrySizeTier,
  resolveCountryOnlyLabel,
} from "@/lib/search/country-size";

export type DestinationKind = "island" | "city" | "region" | "country";

export type DestinationSizeProfile = {
  kind: DestinationKind;
  name: string;
  areaKm2: number;
  maxDriveKm: number;
  wholeWithBeachDays: number;
  wholeSightseeingDays: number;
  kidsExtraDays: number;
};

export type WholeIslandDayTargets = {
  /** Spokojne tempo z plażowaniem. */
  relaxed: number;
  /** Aktywne tempo, mniej leżenia. */
  active: number;
};

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function bboxAreaKm2(bbox: BoundingBox): number {
  const midLat = (bbox.north + bbox.south) / 2;
  const latKm = (bbox.north - bbox.south) * 111;
  const lonKm =
    (bbox.east - bbox.west) * 111 * Math.cos((midLat * Math.PI) / 180);
  return Math.round(latKm * lonKm);
}

function bboxMaxDriveKm(bbox: BoundingBox): number {
  const midLat = (bbox.north + bbox.south) / 2;
  const latKm = (bbox.north - bbox.south) * 111;
  const lonKm =
    (bbox.east - bbox.west) * 111 * Math.cos((midLat * Math.PI) / 180);
  return Math.round(Math.sqrt(latKm ** 2 + lonKm ** 2));
}

/** Progi wg realnej „jazdy po wyspie”, nie bbox (bbox zawyża wąskie wyspy). */
function islandSizeTierByDrive(maxDriveKm: number): {
  wholeWithBeachDays: number;
  wholeSightseeingDays: number;
  kidsExtraDays: number;
} {
  if (maxDriveKm <= 95) {
    return { wholeWithBeachDays: 6, wholeSightseeingDays: 4, kidsExtraDays: 1 };
  }
  if (maxDriveKm <= 130) {
    return { wholeWithBeachDays: 8, wholeSightseeingDays: 5, kidsExtraDays: 1 };
  }
  if (maxDriveKm <= 180) {
    return { wholeWithBeachDays: 10, wholeSightseeingDays: 7, kidsExtraDays: 2 };
  }
  if (maxDriveKm <= 260) {
    return { wholeWithBeachDays: 12, wholeSightseeingDays: 8, kidsExtraDays: 2 };
  }
  return { wholeWithBeachDays: 14, wholeSightseeingDays: 10, kidsExtraDays: 2 };
}

const LARGE_REGION_NAMES = new Set([
  "sycylia",
  "sicily",
  "sardynia",
  "sardinia",
  "kreta",
  "crete",
  "cypr",
  "cyprus",
  "islandia",
  "iceland",
]);

const CITY_DRIVE_KM: Record<string, number> = {
  barcelona: 25,
  paryż: 20,
  paris: 20,
  rzym: 25,
  rome: 25,
  lizbona: 20,
  lisbon: 20,
  praga: 18,
  prague: 18,
  budapeszt: 18,
  budapest: 18,
  wiedeń: 18,
  vienna: 18,
  wenecja: 12,
  venice: 12,
  kraków: 15,
  krakow: 15,
  gdańsk: 12,
  gdansk: 12,
};

export function findCatalogDestination(
  destinationLabel: string | null | undefined,
): DestinationSuggestion | null {
  if (!destinationLabel?.trim()) return null;
  for (const entry of DESTINATION_CATALOG) {
    const n = normalizeSearchText(destinationLabel);
    const name = normalizeSearchText(entry.name);
    if (n.startsWith(name) || n.includes(name)) return entry;
    for (const alias of entry.aliases ?? []) {
      const a = normalizeSearchText(alias);
      if (n.includes(a) || a.includes(n.split(",")[0]?.trim() ?? "")) {
        return entry;
      }
    }
  }
  return null;
}

export function wholeIslandDayTargets(
  profile: DestinationSizeProfile,
  withKids: boolean,
): WholeIslandDayTargets {
  const kidsBump = withKids ? profile.kidsExtraDays : 0;
  return {
    relaxed: profile.wholeWithBeachDays + kidsBump,
    active: profile.wholeSightseeingDays + (withKids ? 1 : 0),
  };
}

/** Mała wyspa (Malta, Gozo…) — rejony na mapie nachodzą na siebie; sensowny jest objazd całości. */
export function isCompactIslandDestination(
  destinationLabel: string | null | undefined,
): boolean {
  const profile = resolveDestinationSizeProfile(destinationLabel);
  return profile?.kind === "island" && profile.maxDriveKm <= 95;
}

export function resolveDestinationSizeProfile(
  destinationLabel: string | null | undefined,
): DestinationSizeProfile | null {
  const entry = findCatalogDestination(destinationLabel);
  const island = resolveIslandBoundary(destinationLabel);

  if (island) {
    const areaKm2 = bboxAreaKm2(island.bbox);
    const maxDriveKm = island.maxRadiusKm * 2;
    const tier = islandSizeTierByDrive(maxDriveKm);
    const manual = entry?.islandProfile;

    return {
      kind: "island",
      name: island.name,
      areaKm2,
      maxDriveKm,
      wholeWithBeachDays: manual?.wholeWithBeachDays ?? tier.wholeWithBeachDays,
      wholeSightseeingDays:
        manual?.wholeSightseeingDays ?? tier.wholeSightseeingDays,
      kidsExtraDays: manual?.kidsExtraDays ?? tier.kidsExtraDays,
    };
  }

  if (!entry) {
    const country = resolveCountryOnlyLabel(destinationLabel);
    if (country) {
      const tier = countrySizeTier(country.areaKm2);
      return {
        kind: "country",
        name: country.namePl,
        areaKm2: country.areaKm2,
        maxDriveKm: country.maxDriveKm,
        ...tier,
      };
    }
    return null;
  }

  const key = normalizeSearchText(entry.name);
  const isLargeRegion = LARGE_REGION_NAMES.has(key);

  if (isLargeRegion) {
    const bbox = entry.islandBbox;
    const areaKm2 = bbox ? bboxAreaKm2(bbox) : 15000;
    const maxDriveKm = bbox ? bboxMaxDriveKm(bbox) : 200;
    const tier = islandSizeTierByDrive(maxDriveKm);
    return {
      kind: "region",
      name: entry.name,
      areaKm2,
      maxDriveKm,
      ...tier,
    };
  }

  const driveKm = CITY_DRIVE_KM[key] ?? 20;
  return {
    kind: "city",
    name: entry.name,
    areaKm2: Math.round(driveKm ** 2 * 0.6),
    maxDriveKm: driveKm,
    wholeWithBeachDays: 4,
    wholeSightseeingDays: 2,
    kidsExtraDays: 1,
  };
}

import { resolveCountryCodeFromLabel } from "@/lib/destinations/europe-profiles";

/** Powierzchnia (km²) i szacunkowy max. dojazd wewnątrz kraju (km). */
const COUNTRY_SIZE: Record<
  string,
  { areaKm2: number; maxDriveKm: number; namePl: string }
> = {
  AL: { areaKm2: 28748, maxDriveKm: 480, namePl: "Albania" },
  AT: { areaKm2: 83879, maxDriveKm: 580, namePl: "Austria" },
  BA: { areaKm2: 51197, maxDriveKm: 420, namePl: "Bośnia i Hercegowina" },
  BE: { areaKm2: 30528, maxDriveKm: 280, namePl: "Belgia" },
  BG: { areaKm2: 110994, maxDriveKm: 470, namePl: "Bułgaria" },
  CH: { areaKm2: 41285, maxDriveKm: 350, namePl: "Szwajcaria" },
  CY: { areaKm2: 9251, maxDriveKm: 220, namePl: "Cypr" },
  CZ: { areaKm2: 78867, maxDriveKm: 400, namePl: "Czechy" },
  DE: { areaKm2: 357114, maxDriveKm: 780, namePl: "Niemcy" },
  DK: { areaKm2: 43094, maxDriveKm: 400, namePl: "Dania" },
  EE: { areaKm2: 45228, maxDriveKm: 350, namePl: "Estonia" },
  ES: { areaKm2: 505992, maxDriveKm: 1050, namePl: "Hiszpania" },
  FI: { areaKm2: 338145, maxDriveKm: 950, namePl: "Finlandia" },
  FR: { areaKm2: 551695, maxDriveKm: 1000, namePl: "Francja" },
  GB: { areaKm2: 243610, maxDriveKm: 850, namePl: "Wielka Brytania" },
  GR: { areaKm2: 131957, maxDriveKm: 800, namePl: "Grecja" },
  HR: { areaKm2: 56594, maxDriveKm: 530, namePl: "Chorwacja" },
  HU: { areaKm2: 93028, maxDriveKm: 450, namePl: "Węgry" },
  IE: { areaKm2: 70273, maxDriveKm: 450, namePl: "Irlandia" },
  IS: { areaKm2: 103000, maxDriveKm: 550, namePl: "Islandia" },
  IT: { areaKm2: 301340, maxDriveKm: 950, namePl: "Włochy" },
  LT: { areaKm2: 65300, maxDriveKm: 380, namePl: "Litwa" },
  LU: { areaKm2: 2586, maxDriveKm: 80, namePl: "Luksemburg" },
  LV: { areaKm2: 64589, maxDriveKm: 380, namePl: "Łotwa" },
  ME: { areaKm2: 13812, maxDriveKm: 280, namePl: "Czarnogóra" },
  MK: { areaKm2: 25713, maxDriveKm: 320, namePl: "Macedonia Północna" },
  MT: { areaKm2: 316, maxDriveKm: 45, namePl: "Malta" },
  NL: { areaKm2: 41543, maxDriveKm: 320, namePl: "Holandia" },
  NO: { areaKm2: 385207, maxDriveKm: 900, namePl: "Norwegia" },
  PL: { areaKm2: 312696, maxDriveKm: 780, namePl: "Polska" },
  PT: { areaKm2: 92090, maxDriveKm: 580, namePl: "Portugalia" },
  RO: { areaKm2: 238397, maxDriveKm: 650, namePl: "Rumunia" },
  RS: { areaKm2: 88361, maxDriveKm: 480, namePl: "Serbia" },
  SE: { areaKm2: 450295, maxDriveKm: 900, namePl: "Szwecja" },
  SI: { areaKm2: 20273, maxDriveKm: 280, namePl: "Słowenia" },
  SK: { areaKm2: 49035, maxDriveKm: 420, namePl: "Słowacja" },
  TR: { areaKm2: 783562, maxDriveKm: 1200, namePl: "Turcja" },
  UA: { areaKm2: 603628, maxDriveKm: 900, namePl: "Ukraina" },
};

/** Progi dni na objazd całego kraju — wg powierzchni. */
export function countrySizeTier(areaKm2: number): {
  wholeWithBeachDays: number;
  wholeSightseeingDays: number;
  kidsExtraDays: number;
} {
  if (areaKm2 <= 5000) {
    return { wholeWithBeachDays: 5, wholeSightseeingDays: 3, kidsExtraDays: 1 };
  }
  if (areaKm2 <= 25000) {
    return { wholeWithBeachDays: 8, wholeSightseeingDays: 6, kidsExtraDays: 1 };
  }
  if (areaKm2 <= 60000) {
    return { wholeWithBeachDays: 10, wholeSightseeingDays: 7, kidsExtraDays: 2 };
  }
  if (areaKm2 <= 120000) {
    return { wholeWithBeachDays: 14, wholeSightseeingDays: 10, kidsExtraDays: 2 };
  }
  return { wholeWithBeachDays: 18, wholeSightseeingDays: 12, kidsExtraDays: 3 };
}

/** Gdy użytkownik wybiera kraj jako destynację (np. „Albania”, nie „Saranda, Albania”). */
export function resolveCountryOnlyLabel(
  destinationLabel: string | null | undefined,
): { code: string; namePl: string; areaKm2: number; maxDriveKm: number } | null {
  if (!destinationLabel?.trim()) return null;

  const parts = destinationLabel.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 1) return null;

  const code = resolveCountryCodeFromLabel(parts[0]!);
  if (!code) return null;

  const size = COUNTRY_SIZE[code];
  if (!size) return null;

  return {
    code,
    namePl: size.namePl,
    areaKm2: size.areaKm2,
    maxDriveKm: size.maxDriveKm,
  };
}

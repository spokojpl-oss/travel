import { resolveCountryCodeFromDestinationLabel } from "@/lib/destinations/europe-profiles";

/** Kraje bez dostępu do morza (Europa + sąsiedztwo). */
const LANDLOCKED_COUNTRY_CODES = new Set([
  "AT",
  "BY",
  "CH",
  "CZ",
  "HU",
  "LI",
  "LU",
  "MD",
  "MK",
  "RS",
  "SK",
  "XK",
]);

/** Destynacje z plażami nad jeziorami / słodką wodą — bez morza, ale plażowanie ma sens. */
const LAKE_BEACH_LABEL_KEYS = [
  "mazury",
  "masuria",
  "mazur",
  "gizycko",
  "giżycko",
  "mikolajki",
  "mikołajki",
  "augustow",
  "augustów",
  "sztynort",
  "ryn",
  "nibork",
  "okuninka",
  "warmia",
  "balaton",
  "lipno",
  "bled",
  "bohinj",
  "annecy",
  "geneva",
  "leman",
  "lugano",
  "como",
  "garda",
  "maggiore",
  "orta",
  "iseo",
  "idro",
  "bodensee",
  "konstanz",
  "constance",
  "titisee",
  "schluchsee",
  "tegernsee",
  "chiemsee",
  "starnberg",
  "ammersee",
  "lakeland",
  "jeziora",
  "okuninka",
  "masurian",
];

export type WaterRecreationKind = "sea" | "lake" | "none";

function normalizeDestinationKey(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[,]/g, " ")
    .trim();
}

export function destinationHasLakeBeaches(destinationLabel: string): boolean {
  const norm = normalizeDestinationKey(destinationLabel);
  if (!norm) return false;
  return LAKE_BEACH_LABEL_KEYS.some(
    (key) => norm.includes(key) || norm.split(/\s+/).some((part) => part === key),
  );
}

export function destinationHasSeaAccess(destinationLabel: string): boolean {
  const label = destinationLabel.trim();
  if (!label) return true;

  if (destinationHasLakeBeaches(label)) return false;

  const countryCode = resolveCountryCodeFromDestinationLabel(label);
  if (countryCode) {
    return !LANDLOCKED_COUNTRY_CODES.has(countryCode);
  }

  const norm = normalizeDestinationKey(label);
  const inlandHints = [
    "czechy",
    "czech",
    "czechia",
    "cesko",
    "prague",
    "praha",
    "praga",
    "brno",
    "budapest",
    "budapeszt",
    "wieden",
    "vienna",
    "wien",
    "salzburg",
    "innsbruck",
    "zurich",
    "zurych",
    "bern",
    "bratislava",
    "bratyslawa",
    "budapeszt",
    "krakow",
    "kraków",
    "zakopane",
  ];
  if (inlandHints.some((hint) => norm.includes(hint))) return false;

  return true;
}

export function resolveWaterRecreationKind(
  destinationLabel: string,
): WaterRecreationKind {
  if (destinationHasLakeBeaches(destinationLabel)) return "lake";
  if (destinationHasSeaAccess(destinationLabel)) return "sea";
  return "none";
}

export function destinationSupportsBeachRelax(destinationLabel: string): boolean {
  return resolveWaterRecreationKind(destinationLabel) !== "none";
}

/** Proporcja tras „nadbrzeże vs ląd” — tylko przy dostępie do morza. */
export function destinationUsesCoastalRouteSplit(
  destinationLabel: string,
): boolean {
  return resolveWaterRecreationKind(destinationLabel) === "sea";
}

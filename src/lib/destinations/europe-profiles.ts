import type { BoundingBox } from "@/types/domain";
import { DESTINATION_CATALOG } from "@/lib/destinations/catalog";

export type EuropeProfileKind = "country" | "city" | "island" | "region";

export type EuropeDestinationProfile = {
  slug: string;
  name: string;
  country: string;
  countryCode: string;
  kind: EuropeProfileKind;
  lat: number;
  lon: number;
  /** Zapytanie Numbeo, np. "Athens, Greece" */
  numbeoQuery: string;
  boundingBox?: BoundingBox;
  geocodeQuery?: string;
};

const COUNTRY_CODES: Record<string, string> = {
  Albania: "AL",
  Austria: "AT",
  Belgia: "BE",
  Belgium: "BE",
  Bułgaria: "BG",
  Bulgaria: "BG",
  Chorwacja: "HR",
  Croatia: "HR",
  Cypr: "CY",
  Cyprus: "CY",
  Czechy: "CZ",
  "Czech Republic": "CZ",
  Dania: "DK",
  Denmark: "DK",
  Estonia: "EE",
  Finlandia: "FI",
  Finland: "FI",
  Francja: "FR",
  France: "FR",
  Grecja: "GR",
  Greece: "GR",
  Hiszpania: "ES",
  Spain: "ES",
  Holandia: "NL",
  Netherlands: "NL",
  Irlandia: "IE",
  Ireland: "IE",
  Islandia: "IS",
  Iceland: "IS",
  Litwa: "LT",
  Lithuania: "LT",
  Łotwa: "LV",
  Latvia: "LV",
  Luksemburg: "LU",
  Luxembourg: "LU",
  Malta: "MT",
  Niemcy: "DE",
  Germany: "DE",
  Norwegia: "NO",
  Norway: "NO",
  Polska: "PL",
  Poland: "PL",
  Portugalia: "PT",
  Portugal: "PT",
  Rumunia: "RO",
  Romania: "RO",
  Serbia: "RS",
  Słowacja: "SK",
  Slovakia: "SK",
  Słowenia: "SI",
  Slovenia: "SI",
  Szwajcaria: "CH",
  Switzerland: "CH",
  Szwecja: "SE",
  Sweden: "SE",
  Tunezja: "TN",
  Tunisia: "TN",
  Turcja: "TR",
  Turkey: "TR",
  Ukraina: "UA",
  Ukraine: "UA",
  Węgry: "HU",
  Hungary: "HU",
  "Wielka Brytania": "GB",
  "United Kingdom": "GB",
  Włochy: "IT",
  Italy: "IT",
  Czarnogóra: "ME",
  Montenegro: "ME",
  "Bośnia i Hercegowina": "BA",
  "Bosnia and Herzegovina": "BA",
  Macedonia: "MK",
  "North Macedonia": "MK",
};

/** Numbeo używa angielskich nazw krajów. */
const NUMBEO_COUNTRY: Record<string, string> = {
  AL: "Albania",
  AT: "Austria",
  BA: "Bosnia And Herzegovina",
  BE: "Belgium",
  BG: "Bulgaria",
  CH: "Switzerland",
  CY: "Cyprus",
  CZ: "Czech Republic",
  DE: "Germany",
  DK: "Denmark",
  EE: "Estonia",
  ES: "Spain",
  FI: "Finland",
  FR: "France",
  GB: "United Kingdom",
  GR: "Greece",
  HR: "Croatia",
  HU: "Hungary",
  IE: "Ireland",
  IS: "Iceland",
  IT: "Italy",
  LT: "Lithuania",
  LU: "Luxembourg",
  LV: "Latvia",
  ME: "Montenegro",
  MK: "North Macedonia",
  MT: "Malta",
  TN: "Tunisia",
  NL: "Netherlands",
  NO: "Norway",
  PL: "Poland",
  PT: "Portugal",
  RO: "Romania",
  RS: "Serbia",
  SE: "Sweden",
  SI: "Slovenia",
  SK: "Slovakia",
  TR: "Turkey",
  UA: "Ukraine",
};

function defaultBbox(lat: number, lon: number, delta = 0.5): BoundingBox {
  return {
    north: lat + delta,
    south: lat - delta,
    east: lon + delta,
    west: lon - delta,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function profileFromCatalogEntry(
  entry: (typeof DESTINATION_CATALOG)[number],
  numbeoCity: string,
  kind: EuropeProfileKind = "city",
): EuropeDestinationProfile {
  const countryCode = COUNTRY_CODES[entry.country] ?? "XX";
  const lat = entry.lat ?? 0;
  const lon = entry.lon ?? 0;
  return {
    slug: slugify(`${entry.name}-${entry.country}`),
    name: entry.name,
    country: entry.country,
    countryCode,
    kind,
    lat,
    lon,
    numbeoQuery: `${numbeoCity}, ${NUMBEO_COUNTRY[countryCode] ?? entry.country}`,
    boundingBox: entry.islandBbox ?? defaultBbox(lat, lon),
    geocodeQuery: entry.geocodeQuery,
  };
}

/** Reprezentatywne miasta/kraje Europy — rozszerzenie katalogu podróżniczego. */
const EXTRA_EUROPE_PROFILES: Omit<
  EuropeDestinationProfile,
  "boundingBox"
>[] = [
  // Kraje — stolice / miasto referencyjne
  { slug: "warszawa-polska", name: "Warszawa", country: "Polska", countryCode: "PL", kind: "city", lat: 52.2297, lon: 21.0122, numbeoQuery: "Warsaw, Poland" },
  { slug: "madryt-hiszpania", name: "Madryt", country: "Hiszpania", countryCode: "ES", kind: "city", lat: 40.4168, lon: -3.7038, numbeoQuery: "Madrid, Spain" },
  { slug: "ateny-grecja", name: "Ateny", country: "Grecja", countryCode: "GR", kind: "city", lat: 37.9838, lon: 23.7275, numbeoQuery: "Athens, Greece" },
  { slug: "berlin-niemcy", name: "Berlin", country: "Niemcy", countryCode: "DE", kind: "city", lat: 52.52, lon: 13.405, numbeoQuery: "Berlin, Germany" },
  { slug: "monachium-niemcy", name: "Monachium", country: "Niemcy", countryCode: "DE", kind: "city", lat: 48.1351, lon: 11.582, numbeoQuery: "Munich, Germany" },
  { slug: "mediolan-wlochy", name: "Mediolan", country: "Włochy", countryCode: "IT", kind: "city", lat: 45.4642, lon: 9.19, numbeoQuery: "Milan, Italy" },
  { slug: "florencja-wlochy", name: "Florencja", country: "Włochy", countryCode: "IT", kind: "city", lat: 43.7696, lon: 11.2558, numbeoQuery: "Florence, Italy" },
  { slug: "amsterdam-holandia", name: "Amsterdam", country: "Holandia", countryCode: "NL", kind: "city", lat: 52.3676, lon: 4.9041, numbeoQuery: "Amsterdam, Netherlands" },
  { slug: "bruksela-belgia", name: "Bruksela", country: "Belgia", countryCode: "BE", kind: "city", lat: 50.8503, lon: 4.3517, numbeoQuery: "Brussels, Belgium" },
  { slug: "zurych-szwajcaria", name: "Zurych", country: "Szwajcaria", countryCode: "CH", kind: "city", lat: 47.3769, lon: 8.5417, numbeoQuery: "Zurich, Switzerland" },
  { slug: "londyn-wielka-brytania", name: "Londyn", country: "Wielka Brytania", countryCode: "GB", kind: "city", lat: 51.5074, lon: -0.1278, numbeoQuery: "London, United Kingdom" },
  { slug: "edynburg-wielka-brytania", name: "Edynburg", country: "Wielka Brytania", countryCode: "GB", kind: "city", lat: 55.9533, lon: -3.1883, numbeoQuery: "Edinburgh, United Kingdom" },
  { slug: "dublin-irlandia", name: "Dublin", country: "Irlandia", countryCode: "IE", kind: "city", lat: 53.3498, lon: -6.2603, numbeoQuery: "Dublin, Ireland" },
  { slug: "kopenhaga-dania", name: "Kopenhaga", country: "Dania", countryCode: "DK", kind: "city", lat: 55.6761, lon: 12.5683, numbeoQuery: "Copenhagen, Denmark" },
  { slug: "sztokholm-szwecja", name: "Sztokholm", country: "Szwecja", countryCode: "SE", kind: "city", lat: 59.3293, lon: 18.0686, numbeoQuery: "Stockholm, Sweden" },
  { slug: "helsinki-finlandia", name: "Helsinki", country: "Finlandia", countryCode: "FI", kind: "city", lat: 60.1699, lon: 24.9384, numbeoQuery: "Helsinki, Finland" },
  { slug: "tallinn-estonia", name: "Tallinn", country: "Estonia", countryCode: "EE", kind: "city", lat: 59.437, lon: 24.7536, numbeoQuery: "Tallinn, Estonia" },
  { slug: "riga-lotwa", name: "Ryga", country: "Łotwa", countryCode: "LV", kind: "city", lat: 56.9496, lon: 24.1052, numbeoQuery: "Riga, Latvia" },
  { slug: "wilno-litwa", name: "Wilno", country: "Litwa", countryCode: "LT", kind: "city", lat: 54.6872, lon: 25.2797, numbeoQuery: "Vilnius, Lithuania" },
  { slug: "bukareszt-rumunia", name: "Bukareszt", country: "Rumunia", countryCode: "RO", kind: "city", lat: 44.4268, lon: 26.1025, numbeoQuery: "Bucharest, Romania" },
  { slug: "sofia-bulgaria", name: "Sofia", country: "Bułgaria", countryCode: "BG", kind: "city", lat: 42.6977, lon: 23.3219, numbeoQuery: "Sofia, Bulgaria" },
  { slug: "belgrad-serbia", name: "Belgrad", country: "Serbia", countryCode: "RS", kind: "city", lat: 44.7866, lon: 20.4489, numbeoQuery: "Belgrade, Serbia" },
  { slug: "ljubljana-slowenia", name: "Lublana", country: "Słowenia", countryCode: "SI", kind: "city", lat: 46.0569, lon: 14.5058, numbeoQuery: "Ljubljana, Slovenia" },
  { slug: "zagrzeb-chorwacja", name: "Zagrzeb", country: "Chorwacja", countryCode: "HR", kind: "city", lat: 45.815, lon: 15.9819, numbeoQuery: "Zagreb, Croatia" },
  { slug: "budva-czarnogora", name: "Budva", country: "Czarnogóra", countryCode: "ME", kind: "city", lat: 42.2864, lon: 18.84, numbeoQuery: "Podgorica, Montenegro" },
  { slug: "stambul-turcja", name: "Stambuł", country: "Turcja", countryCode: "TR", kind: "city", lat: 41.0082, lon: 28.9784, numbeoQuery: "Istanbul, Turkey" },
  { slug: "zadar-chorwacja", name: "Zadar", country: "Chorwacja", countryCode: "HR", kind: "city", lat: 44.1194, lon: 15.2314, numbeoQuery: "Zadar, Croatia" },
  { slug: "bratyslawa-slowacja", name: "Bratysława", country: "Słowacja", countryCode: "SK", kind: "city", lat: 48.1486, lon: 17.1077, numbeoQuery: "Bratislava, Slovakia" },
];

const CATALOG_NUMBEO_CITY: Record<string, string> = {
  Madera: "Funchal",
  Majorka: "Palma de Mallorca",
  Kreta: "Heraklion",
  Saranda: "Sarande",
  Teneryfa: "Santa Cruz de Tenerife",
  Lanzarote: "Arrecife",
  Fuerteventura: "Puerto del Rosario",
  "Gran Canaria": "Las Palmas",
  Rodos: "Rhodes",
  Korfu: "Corfu",
  Santorini: "Santorini",
  Dubrownik: "Dubrovnik",
  Cypr: "Nicosia",
  Lizbona: "Lisbon",
  Walencja: "Valencia",
  Alikante: "Alicante",
  Rzym: "Rome",
  Sycylia: "Palermo",
  Sardynia: "Cagliari",
  Wenecja: "Venice",
  Paryż: "Paris",
  Nicea: "Nice",
  Korsyka: "Ajaccio",
  Malta: "Valletta",
  Ibiza: "Ibiza",
  Menorca: "Mahon",
  Formentera: "Formentera",
  "La Palma": "Santa Cruz de La Palma",
  "La Gomera": "San Sebastian de la Gomera",
  "El Hierro": "Valverde",
  Mykonos: "Mykonos",
  Naxos: "Naxos",
  Paros: "Paros",
  Milos: "Milos",
  Tinos: "Tinos",
  Andros: "Andros",
  Sifnos: "Sifnos",
  Ios: "Ios",
  Amorgos: "Amorgos",
  Syros: "Syros",
  Skiathos: "Skiathos",
  Skopelos: "Skopelos",
  Zakynthos: "Zakynthos",
  Kefalonia: "Argostoli",
  Lefkada: "Lefkada",
  Kos: "Kos",
  Samos: "Samos",
  Thasos: "Thasos",
  Hydra: "Hydra",
  Spetses: "Spetses",
  Krk: "Krk",
  Hvar: "Hvar",
  "Brač": "Bol",
  Vis: "Vis",
  "Korčula": "Korcula",
  Pag: "Novalja",
  Mljet: "Mljet",
  Rab: "Rab",
  "São Miguel (Azory)": "Ponta Delgada",
  "Faial (Azory)": "Horta",
  "Terceira (Azory)": "Angra do Heroismo",
  Capri: "Capri",
  Ischia: "Ischia",
  "Wyspy Eolskie": "Lipari",
  Gotlandia: "Visby",
  Djerba: "Djerba",
  Islandia: "Reykjavik",
  Zakopane: "Krakow",
};

function catalogProfiles(): EuropeDestinationProfile[] {
  return DESTINATION_CATALOG.map((entry) => {
    const numbeoCity = CATALOG_NUMBEO_CITY[entry.name] ?? entry.name;
    const kind: EuropeProfileKind = entry.islandBbox ? "island" : "city";
    return profileFromCatalogEntry(entry, numbeoCity, kind);
  });
}

function extraProfiles(): EuropeDestinationProfile[] {
  return EXTRA_EUROPE_PROFILES.map((p) => ({
    ...p,
    boundingBox: defaultBbox(p.lat, p.lon),
  }));
}

/** Unikalna lista profili europejskich (slug jako klucz). */
export function getEuropeDestinationProfiles(): EuropeDestinationProfile[] {
  const bySlug = new Map<string, EuropeDestinationProfile>();
  for (const p of [...catalogProfiles(), ...extraProfiles()]) {
    if (!bySlug.has(p.slug)) {
      bySlug.set(p.slug, p);
    }
  }
  return [...bySlug.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "pl"),
  );
}

export function resolveCountryCode(countryLabel: string): string {
  return COUNTRY_CODES[countryLabel] ?? "XX";
}

function normalizeCountrySearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Dopasowanie nazwy kraju (PL/EN, bez względu na wielkość liter). */
export function resolveCountryCodeFromLabel(label: string): string | null {
  const direct = COUNTRY_CODES[label.trim()];
  if (direct) return direct;
  const normalized = normalizeCountrySearchText(label);
  for (const [name, code] of Object.entries(COUNTRY_CODES)) {
    if (normalizeCountrySearchText(name) === normalized) return code;
  }
  return null;
}

export function numbeoCountryName(countryCode: string): string {
  return NUMBEO_COUNTRY[countryCode] ?? countryCode;
}

export const EUROPE_REFERENCE_NUMBEO_QUERY = "Warsaw, Poland";

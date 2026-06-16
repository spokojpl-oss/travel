import { DESTINATION_CATALOG } from "@/lib/destinations/catalog";

/** Curated travel photos — never maps, flags, or Wikipedia page thumbnails. */
const CATALOG_HERO_IMAGES: Record<string, string> = {
  madera:
    "https://upload.wikimedia.org/wikipedia/commons/b/bd/Funchal_%28Madeira%2C_Portugal%29%2C_Rua_de_Santa_Maria_39_--_2025_--_0831.jpg",
  majorka: "https://upload.wikimedia.org/wikipedia/commons/2/24/Mallorca.jpg",
  kreta:
    "https://upload.wikimedia.org/wikipedia/commons/7/7c/Balos_lagoon_Crete_Greece.jpg",
  saranda:
    "https://upload.wikimedia.org/wikipedia/commons/0/0a/Giro_harte_beach_-_Saranda_Beaches.jpg",
  teneryfa:
    "https://upload.wikimedia.org/wikipedia/commons/3/30/Teide_%28Canary_Islands%29_from_air.jpg",
  lanzarote:
    "https://upload.wikimedia.org/wikipedia/commons/0/00/Timanfaya-_Lanzarote-_Illas_Canarias-_Spain-T20.jpg",
  fuerteventura:
    "https://upload.wikimedia.org/wikipedia/commons/a/aa/Morro_Jable_%28Fuerteventura%2C_Spain%29%2C_Strand_--_2025_--_2487.jpg",
  "gran canaria":
    "https://upload.wikimedia.org/wikipedia/commons/f/f4/GC_Dunas_de_Maspalomas_R04.jpg",
  rodos:
    "https://upload.wikimedia.org/wikipedia/commons/b/bd/Ancient_Greek_theatre_in_Lindos_01.jpg",
  korfu:
    "https://upload.wikimedia.org/wikipedia/commons/c/cb/Korfu_%28GR%29%2C_Paleokastritsa%2C_Kloster_--_2018_--_1243.jpg",
  santorini:
    "https://upload.wikimedia.org/wikipedia/commons/5/56/View_of_Oia%2C_Santorini%2C_Greece.jpg",
  dubrownik:
    "https://upload.wikimedia.org/wikipedia/commons/7/70/Dubrovnik_Old_Town_1.jpg",
  split:
    "https://upload.wikimedia.org/wikipedia/commons/0/02/Old_Town%2C_Split_%28P1080956%29.jpg",
  cypr:
    "https://upload.wikimedia.org/wikipedia/commons/6/6b/Playa_Nissi%2C_L%C3%A1rnaca%2C_Chipre%2C_2021-12-12%2C_DD_15.jpg",
  antalya:
    "https://upload.wikimedia.org/wikipedia/commons/3/3f/Antalya_Konyaalti_Beach.jpg",
  bodrum:
    "https://upload.wikimedia.org/wikipedia/commons/b/bd/Bodrum_Castle_%282017%29.jpg",
  lizbona:
    "https://upload.wikimedia.org/wikipedia/commons/9/93/Lisbon_aerial_view.jpg",
  porto:
    "https://upload.wikimedia.org/wikipedia/commons/d/d1/Lu%C3%ADs_I_Bridge%2C_Porto%2C_Portugal_-_May_2017.jpg",
  barcelona:
    "https://upload.wikimedia.org/wikipedia/commons/5/56/Barcelona_Skyline_Panorama_-_Dec_2007.jpg",
  walencja:
    "https://upload.wikimedia.org/wikipedia/commons/4/4b/City_of_Arts_and_Sciences%2C_Valencia%2C_Spain.jpg",
  alikante:
    "https://upload.wikimedia.org/wikipedia/commons/d/d5/Explanada_de_Espa%C3%B1a_Alicante_1.jpg",
  rzym:
    "https://upload.wikimedia.org/wikipedia/commons/d/d8/Colosseum_in_Rome-April_2007-1-_copie_2B.jpg",
  sycylia:
    "https://upload.wikimedia.org/wikipedia/commons/d/d5/Taormina_BW_2025-04-27_09-32-30.jpg",
  sardynia:
    "https://upload.wikimedia.org/wikipedia/commons/8/8c/Cala_Goloritz%C3%A9%2C_Sardinia%2C_Italy.jpg",
  wenecja:
    "https://upload.wikimedia.org/wikipedia/commons/1/17/Panorama_of_Canal_Grande_and_Ponte_di_Rialto%2C_Venice_-_September_2017.jpg",
  paryż:
    "https://upload.wikimedia.org/wikipedia/commons/a/a8/Eiffel_Tower_from_the_Tour_Montparnasse_3%2C_Paris_2014.jpg",
  nicea:
    "https://upload.wikimedia.org/wikipedia/commons/1/1b/Nice-night-view-with-blurred-cars_1200x900.jpg",
  korsyka: "https://upload.wikimedia.org/wikipedia/commons/d/da/Bonifacio.jpg",
  islandia:
    "https://upload.wikimedia.org/wikipedia/commons/e/ea/Kirkjufell%2C_Iceland%2C_20240714_1631_0713.jpg",
  oslo:
    "https://upload.wikimedia.org/wikipedia/commons/2/26/Oslo_Opera_House_2023_1.jpg",
  bergen:
    "https://upload.wikimedia.org/wikipedia/commons/b/b3/Fassaden_in_Bryggen%2C_Bergen_N.jpg",
  praga:
    "https://upload.wikimedia.org/wikipedia/commons/e/e5/Prague_from_Petr%C3%8Fin_Lookout_Tower.jpg",
  budapeszt:
    "https://upload.wikimedia.org/wikipedia/commons/6/6a/Hungarian_Parliament_Building%2C_Budapest%2C_Hungary.jpg",
  wiedeń:
    "https://upload.wikimedia.org/wikipedia/commons/1/1b/Palacio_de_Sch%C3%B6nbrunn%2C_Viena%2C_Austria%2C_2020-02-02%2C_DD_10.jpg",
  zakopane:
    "https://upload.wikimedia.org/wikipedia/commons/8/8a/Giewont_%28Tatra_Mountains%29_seen_from_Ko%C5%9Bcielisko.jpg",
  gdańsk:
    "https://upload.wikimedia.org/wikipedia/commons/1/11/Gda%C5%84sk_D%C5%82ugi_Targ_noc%C4%85.jpg",
  kraków:
    "https://upload.wikimedia.org/wikipedia/commons/5/5a/Krak%C3%B3w_-_Rynek_G%C5%82%C3%B3wny.jpg",
};

const REJECTED_HERO_PATTERNS = [
  /map_of/i,
  /\/map/i,
  /[-_]map[._-]/i,
  /locator_map/i,
  /outline_map/i,
  /political_map/i,
  /geographic_map/i,
  /administrative/i,
  /flag_of/i,
  /coat_of_arms/i,
  /emblem_of/i,
  /blank_map/i,
  /location_map/i,
  /\.svg(\.png)?$/i,
  /\/thumb\/.*\.svg\//i,
];

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isAcceptableHeroImageUrl(
  url: string | null | undefined,
): boolean {
  if (!url) return false;
  const decoded = decodeURIComponent(url).toLowerCase();
  return !REJECTED_HERO_PATTERNS.some((pattern) => pattern.test(decoded));
}

function catalogHeroUrl(catalogName: string): string | null {
  const url = CATALOG_HERO_IMAGES[normalizeKey(catalogName)];
  if (!url || !isAcceptableHeroImageUrl(url)) return null;
  return url;
}

export function resolveCuratedHeroImageUrl(
  destinationLabel: string,
): string | null {
  const place =
    destinationLabel.split(",")[0]?.trim() ?? destinationLabel.trim();
  const placeKey = normalizeKey(place);

  const direct = CATALOG_HERO_IMAGES[placeKey];
  if (direct && isAcceptableHeroImageUrl(direct)) return direct;

  const catalogHit = DESTINATION_CATALOG.find((d) => {
    const nameKey = normalizeKey(d.name);
    if (nameKey === placeKey) return true;
    return (d.aliases ?? []).some((a) => normalizeKey(a) === placeKey);
  });

  if (catalogHit) {
    return catalogHeroUrl(catalogHit.name);
  }

  return null;
}

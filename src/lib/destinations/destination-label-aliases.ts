import { DESTINATION_CATALOG } from "@/lib/destinations/catalog";

function slugKey(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)[0] ?? text;
}

/** Polskie nazwy z katalogu → dodatkowe klucze EN/lokalne do dopasowania regionów. */
export function buildDestinationLabelAliases(): Record<string, string[]> {
  const aliases: Record<string, string[]> = {
    alikante: ["alicante", "costa blanca", "comunidad valenciana", "wspolnota walencka"],
    walencja: ["valencia", "comunidad valenciana"],
    majorka: ["mallorca", "majorca", "baleares"],
    lizbona: ["lisbon", "lisboa"],
    madryt: ["madrid"],
    barcelona: ["catalonia", "katalonia"],
    sewilla: ["seville", "sevilla", "andaluzja"],
    granada: ["andaluzja", "sierra nevada"],
    malaga: ["malaga", "costa del sol"],
    kreta: ["crete", "heraklion"],
    cypr: ["cyprus", "nicosia"],
    korfu: ["corfu"],
    rodos: ["rhodes"],
    dubrownik: ["dubrovnik"],
    split: ["dalmatia", "dalmacja"],
    sycylia: ["sicily", "palermo"],
    sardynia: ["sardinia", "cagliari"],
    wenecja: ["venice", "venezia"],
    paryz: ["paris"],
    nicea: ["nice"],
    rzym: ["rome", "roma"],
    praga: ["prague", "praha"],
    budapeszt: ["budapest"],
    wieden: ["vienna", "wien"],
    krakow: ["krakow", "cracow"],
    gdansk: ["gdansk"],
    zakopane: ["tatry", "tatra"],
    teneryfa: ["tenerife", "canarias"],
    lanzarote: ["canarias", "canary islands"],
    fuerteventura: ["canarias"],
    madera: ["madeira", "funchal"],
    saranda: ["ksamil", "albania"],
    antalya: ["turkey", "turcja"],
    bodrum: ["turkey", "turcja"],
    islandia: ["iceland", "reykjavik"],
    oslo: ["norway", "norwegia"],
    bergen: ["norway", "norwegia"],
    korsyka: ["corsica", "ajaccio"],
  };

  for (const dest of DESTINATION_CATALOG) {
    const head = slugKey(dest.name);
    if (!head) continue;
    const extra = new Set<string>(aliases[head] ?? []);
    for (const alias of dest.aliases ?? []) {
      extra.add(slugKey(alias));
    }
    if (dest.geocodeQuery) {
      extra.add(slugKey(dest.geocodeQuery.split(",")[0] ?? ""));
    }
    if (extra.size > 0) {
      aliases[head] = [...extra].filter(Boolean);
    }
  }

  return aliases;
}

export const DESTINATION_LABEL_ALIASES = buildDestinationLabelAliases();

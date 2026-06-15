export type DestinationSuggestion = {
  name: string;
  country: string;
  region?: string;
  /** Alternatywne zapisy (np. alicante, mallorca) do wyszukiwania po polsku. */
  aliases?: string[];
  /** Zapytanie do geokodera OSM — gdy polska nazwa nie trafia w bazie. */
  geocodeQuery?: string;
  lat?: number;
  lon?: number;
};

export const DESTINATION_CATALOG: DestinationSuggestion[] = [
  { name: "Madera", country: "Portugalia", aliases: ["madeira", "funchal"], geocodeQuery: "Madeira, Portugal", lat: 32.6669, lon: -16.9241 },
  { name: "Majorka", country: "Hiszpania", aliases: ["mallorca", "majorca", "palma"], geocodeQuery: "Mallorca, Spain", lat: 39.5696, lon: 2.6502 },
  { name: "Kreta", country: "Grecja", aliases: ["crete", "heraklion"], geocodeQuery: "Crete, Greece", lat: 35.3387, lon: 25.1442 },
  { name: "Saranda", country: "Albania", lat: 39.8753, lon: 20.0044 },
  { name: "Teneryfa", country: "Hiszpania", aliases: ["tenerife"], geocodeQuery: "Tenerife, Spain", lat: 28.4636, lon: -16.2518 },
  { name: "Lanzarote", country: "Hiszpania", lat: 28.963, lon: -13.5477 },
  { name: "Fuerteventura", country: "Hiszpania", lat: 28.5004, lon: -13.8627 },
  { name: "Gran Canaria", country: "Hiszpania", aliases: ["gran canaria", "las palmas"], lat: 28.1235, lon: -15.4363 },
  { name: "Rodos", country: "Grecja", aliases: ["rhodes"], geocodeQuery: "Rhodes, Greece", lat: 36.4341, lon: 28.2176 },
  { name: "Korfu", country: "Grecja", aliases: ["corfu"], geocodeQuery: "Corfu, Greece", lat: 39.6243, lon: 19.9217 },
  { name: "Santorini", country: "Grecja", lat: 36.3932, lon: 25.4615 },
  { name: "Dubrownik", country: "Chorwacja", aliases: ["dubrovnik"], geocodeQuery: "Dubrovnik, Croatia", lat: 42.6507, lon: 18.0944 },
  { name: "Split", country: "Chorwacja", lat: 43.5081, lon: 16.4402 },
  { name: "Cypr", country: "Cypr", aliases: ["cyprus", "nikozja", "nicosia"], geocodeQuery: "Cyprus", lat: 35.1856, lon: 33.3823 },
  { name: "Antalya", country: "Turcja", lat: 36.8969, lon: 30.7133 },
  { name: "Bodrum", country: "Turcja", lat: 37.0344, lon: 27.4305 },
  { name: "Lizbona", country: "Portugalia", aliases: ["lisbon", "lisboa"], geocodeQuery: "Lisbon, Portugal", lat: 38.7223, lon: -9.1393 },
  { name: "Porto", country: "Portugalia", lat: 41.1579, lon: -8.6291 },
  { name: "Barcelona", country: "Hiszpania", lat: 41.3874, lon: 2.1686 },
  { name: "Walencja", country: "Hiszpania", aliases: ["valencia"], geocodeQuery: "Valencia, Spain", lat: 39.4699, lon: -0.3763 },
  { name: "Alikante", country: "Hiszpania", aliases: ["alicante", "alc"], geocodeQuery: "Alicante, Spain", lat: 38.3452, lon: -0.481 },
  { name: "Rzym", country: "Włochy", aliases: ["rome", "roma"], geocodeQuery: "Rome, Italy", lat: 41.9028, lon: 12.4964 },
  { name: "Sycylia", country: "Włochy", aliases: ["sicily", "palermo"], geocodeQuery: "Sicily, Italy", lat: 38.1157, lon: 13.3615 },
  { name: "Sardynia", country: "Włochy", aliases: ["sardinia", "cagliari"], geocodeQuery: "Sardinia, Italy", lat: 39.2238, lon: 9.1217 },
  { name: "Wenecja", country: "Włochy", aliases: ["venice", "venezia"], geocodeQuery: "Venice, Italy", lat: 45.4408, lon: 12.3155 },
  { name: "Paryż", country: "Francja", aliases: ["paris"], geocodeQuery: "Paris, France", lat: 48.8566, lon: 2.3522 },
  { name: "Nicea", country: "Francja", aliases: ["nice"], geocodeQuery: "Nice, France", lat: 43.7102, lon: 7.262 },
  { name: "Korsyka", country: "Francja", aliases: ["corsica", "ajaccio"], geocodeQuery: "Corsica, France", lat: 41.9192, lon: 8.7386 },
  { name: "Islandia", country: "Islandia", aliases: ["iceland", "reykjavik"], geocodeQuery: "Iceland", lat: 64.1466, lon: -21.9426 },
  { name: "Oslo", country: "Norwegia", lat: 59.9139, lon: 10.7522 },
  { name: "Bergen", country: "Norwegia", lat: 60.3913, lon: 5.3221 },
  { name: "Praga", country: "Czechy", aliases: ["prague", "praha"], geocodeQuery: "Prague, Czechia", lat: 50.0755, lon: 14.4378 },
  { name: "Budapeszt", country: "Węgry", aliases: ["budapest"], geocodeQuery: "Budapest, Hungary", lat: 47.4979, lon: 19.0402 },
  { name: "Wiedeń", country: "Austria", aliases: ["vienna", "wien"], geocodeQuery: "Vienna, Austria", lat: 48.2082, lon: 16.3738 },
  { name: "Zakopane", country: "Polska", region: "Tatry", lat: 49.2992, lon: 19.9496 },
  { name: "Gdańsk", country: "Polska", aliases: ["gdansk"], lat: 54.352, lon: 18.6466 },
  { name: "Kraków", country: "Polska", aliases: ["krakow", "cracow"], lat: 50.0647, lon: 19.945 },
];

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

export function searchDestinationCatalog(
  query: string,
  limit = 8,
): DestinationSuggestion[] {
  const q = normalizeSearchText(query);
  if (!q) {
    return DESTINATION_CATALOG.slice(0, limit);
  }

  const scored = DESTINATION_CATALOG.map((d) => {
    const name = normalizeSearchText(d.name);
    const country = normalizeSearchText(d.country);
    const region = d.region ? normalizeSearchText(d.region) : "";
    const aliases = (d.aliases ?? []).map(normalizeSearchText);

    let score = 0;
    if (name === q) score += 100;
    else if (name.startsWith(q)) score += 80;
    else if (name.includes(q)) score += 50;

    if (aliases.some((a) => a === q)) score += 90;
    else if (aliases.some((a) => a.startsWith(q) || q.startsWith(a))) score += 70;
    else if (aliases.some((a) => a.includes(q) || q.includes(a))) score += 40;

    if (country.includes(q)) score += 20;
    if (region && region.includes(q)) score += 30;

    return { d, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return scored.slice(0, limit).map((x) => x.d);
  }

  return DESTINATION_CATALOG.filter(
    (d) =>
      normalizeSearchText(d.name).includes(q) ||
      normalizeSearchText(d.country).includes(q) ||
      (d.region ? normalizeSearchText(d.region).includes(q) : false) ||
      (d.aliases ?? []).some((a) => normalizeSearchText(a).includes(q)),
  ).slice(0, limit);
}

export function formatDestinationLabel(dest: DestinationSuggestion): string {
  return `${dest.name}, ${dest.country}`;
}

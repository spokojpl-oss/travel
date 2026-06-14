export type DestinationSuggestion = {
  name: string;
  country: string;
  region?: string;
};

export const DESTINATION_CATALOG: DestinationSuggestion[] = [
  { name: "Madera", country: "Portugalia" },
  { name: "Mallorca", country: "Hiszpania" },
  { name: "Kreta", country: "Grecja" },
  { name: "Saranda", country: "Albania" },
  { name: "Teneryfa", country: "Hiszpania" },
  { name: "Lanzarote", country: "Hiszpania" },
  { name: "Fuerteventura", country: "Hiszpania" },
  { name: "Gran Canaria", country: "Hiszpania" },
  { name: "Rodos", country: "Grecja" },
  { name: "Korfu", country: "Grecja" },
  { name: "Santorini", country: "Grecja" },
  { name: "Dubrownik", country: "Chorwacja" },
  { name: "Split", country: "Chorwacja" },
  { name: "Cypr", country: "Cypr" },
  { name: "Antalya", country: "Turcja" },
  { name: "Bodrum", country: "Turcja" },
  { name: "Lizbona", country: "Portugalia" },
  { name: "Porto", country: "Portugalia" },
  { name: "Barcelona", country: "Hiszpania" },
  { name: "Walencja", country: "Hiszpania" },
  { name: "Rzym", country: "Włochy" },
  { name: "Sycylia", country: "Włochy" },
  { name: "Sardynia", country: "Włochy" },
  { name: "Wenecja", country: "Włochy" },
  { name: "Paryż", country: "Francja" },
  { name: "Nicea", country: "Francja" },
  { name: "Korsyka", country: "Francja" },
  { name: "Islandia", country: "Islandia" },
  { name: "Oslo", country: "Norwegia" },
  { name: "Bergen", country: "Norwegia" },
  { name: "Praga", country: "Czechy" },
  { name: "Budapeszt", country: "Węgry" },
  { name: "Wiedeń", country: "Austria" },
  { name: "Zakopane", country: "Polska", region: "Tatry" },
  { name: "Gdańsk", country: "Polska" },
  { name: "Kraków", country: "Polska" },
];

export function searchDestinationCatalog(
  query: string,
  limit = 8,
): DestinationSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return DESTINATION_CATALOG.slice(0, limit);
  }

  return DESTINATION_CATALOG.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      d.country.toLowerCase().includes(q) ||
      (d.region?.toLowerCase().includes(q) ?? false),
  ).slice(0, limit);
}

export function formatDestinationLabel(dest: DestinationSuggestion): string {
  return `${dest.name}, ${dest.country}`;
}

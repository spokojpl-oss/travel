import { distanceKm } from "@/lib/search/geo-clustering";
import { computeAttractionsCentroid } from "@/lib/hotels/proximity";
import type { Advisor, Advisory, AdvisorContext } from "./types";

export const accommodationLocationAdvisor: Advisor = {
  category: "accommodation_location",
  async analyze(context: AdvisorContext): Promise<Advisory[]> {
    if (context.selectedAttractions.length < 2) return [];
    if (!context.selectedHotel) return [];
    if (!context.selectedAirport) return [];

    const centroid = computeAttractionsCentroid(
      context.selectedAttractions.map((a) => ({
        id: a.id,
        name: a.name,
        lat: a.lat,
        lon: a.lon,
      })),
    );
    if (!centroid) return [];

    const hotelToCentroid = distanceKm(
      { lat: context.selectedHotel.lat, lon: context.selectedHotel.lon },
      centroid,
    );

    const airportToCentroid = distanceKm(
      { lat: context.selectedAirport.lat, lon: context.selectedAirport.lon },
      centroid,
    );

    const hotelToAirport = distanceKm(
      { lat: context.selectedHotel.lat, lon: context.selectedHotel.lon },
      { lat: context.selectedAirport.lat, lon: context.selectedAirport.lon },
    );

    const distances = context.selectedAttractions.map((a) =>
      distanceKm(
        { lat: context.selectedHotel!.lat, lon: context.selectedHotel!.lon },
        { lat: a.lat, lon: a.lon },
      ),
    );
    const maxDistance = Math.max(...distances);
    const avgDistance =
      distances.reduce((s, d) => s + d, 0) / distances.length;

    const advisories: Advisory[] = [];

    if (hotelToCentroid > 50 && hotelToAirport < 20 && airportToCentroid > 50) {
      const tripDays = Math.round(
        (new Date(context.trip.date_to).getTime() -
          new Date(context.trip.date_from).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const totalDistanceLost = avgDistance * 2 * tripDays;
      const fuelCostPln = Math.round((totalDistanceLost * 7 * 6.5) / 100);
      const hoursLost = Math.round((totalDistanceLost / 60) * 10) / 10;

      advisories.push({
        category: "accommodation_location",
        severity: "warning",
        title: "Hotel jest daleko od Twoich atrakcji",
        reasoning: `Hotel znajduje się ${Math.round(hotelToCentroid)} km od centrum Twoich atrakcji. Średnio do każdej atrakcji to ${Math.round(avgDistance)} km, najdalej ${Math.round(maxDistance)} km. Przez ${tripDays} dni codziennego dojazdu = ~${Math.round(totalDistanceLost)} km łącznie. To ${hoursLost}h jazdy i ~${fuelCostPln} PLN za paliwo.`,
        suggested_action: `Rozważ hotel bliżej atrakcji (max 20-30 km), nawet jeśli będzie dalej od lotniska. Transfer z lotniska to JEDEN dojazd, atrakcje to ${tripDays - 1} dojazdów. Lepiej raz pojechać 2h niż 7 razy po 1h.`,
        source_facts: {
          hotel_id: context.selectedHotel.id,
          hotel_name: context.selectedHotel.name,
          hotel_to_centroid_km: Math.round(hotelToCentroid),
          airport_to_centroid_km: Math.round(airportToCentroid),
          hotel_to_airport_km: Math.round(hotelToAirport),
          attraction_distances_km: distances.map((d) => Math.round(d)),
        },
        estimated_savings_pln: fuelCostPln,
      });
    } else if (maxDistance > 60 && context.selectedAttractions.length > 3) {
      advisories.push({
        category: "accommodation_location",
        severity: "suggestion",
        title: "Twoje atrakcje są bardzo rozproszone",
        reasoning: `Najdalsza atrakcja od hotelu to ${Math.round(maxDistance)} km. To ponad 1h jazdy w jedną stronę.`,
        suggested_action:
          "Rozważ albo: (a) pogrupować atrakcje na 2 lokalizacje hotelowe (split-stay), albo (b) odpuścić najdalszą atrakcję, albo (c) zmienić bazę.",
        source_facts: {
          max_distance_km: Math.round(maxDistance),
          avg_distance_km: Math.round(avgDistance),
          attractions_count: context.selectedAttractions.length,
        },
      });
    }

    return advisories;
  },
};

import { createAdminClient } from "@/lib/supabase/admin";
import { fetchPriceCalendar } from "@/lib/api/travelpayouts";
import { distanceKm } from "@/lib/search/geo-clustering";
import type { Advisor, Advisory, AdvisorContext } from "./types";

export const openJawAdvisor: Advisor = {
  category: "open_jaw",
  async analyze(context: AdvisorContext): Promise<Advisory[]> {
    if (!context.selectedAirport) return [];
    if (context.selectedAttractions.length < 3) return [];

    const supabase = createAdminClient();
    const lats = context.selectedAttractions.map((a) => a.lat);
    const lons = context.selectedAttractions.map((a) => a.lon);
    const searchBbox = {
      north: Math.max(...lats) + 1,
      south: Math.min(...lats) - 1,
      east: Math.max(...lons) + 1,
      west: Math.min(...lons) - 1,
    };

    const { data: nearbyAirports } = await supabase
      .from("airports")
      .select("*")
      .gte("lat", searchBbox.south)
      .lte("lat", searchBbox.north)
      .gte("lon", searchBbox.west)
      .lte("lon", searchBbox.east)
      .in("airport_type", ["large", "medium"])
      .eq("scheduled_service", true);

    if (!nearbyAirports || nearbyAirports.length < 2) return [];

    const distancesFromSelected = context.selectedAttractions.map((a) =>
      distanceKm(
        {
          lat: context.selectedAirport!.lat,
          lon: context.selectedAirport!.lon,
        },
        { lat: a.lat, lon: a.lon },
      ),
    );
    const farthestIdx = distancesFromSelected.indexOf(
      Math.max(...distancesFromSelected),
    );
    const farthestAttraction = context.selectedAttractions[farthestIdx];

    const alternatives = nearbyAirports
      .filter((a) => a.iata_code !== context.selectedAirport!.iata_code)
      .map((a) => ({
        ...a,
        distance_to_farthest: distanceKm(
          { lat: a.lat, lon: a.lon },
          { lat: farthestAttraction.lat, lon: farthestAttraction.lon },
        ),
      }))
      .sort((a, b) => a.distance_to_farthest - b.distance_to_farthest);

    const bestAlternative = alternatives[0];
    if (!bestAlternative) return [];

    const currentToFarthest = distancesFromSelected[farthestIdx];
    if (currentToFarthest - bestAlternative.distance_to_farthest < 30) {
      return [];
    }

    const origin = "WAW";
    const departureMonth = context.trip.date_from.substring(0, 7);
    const returnMonth = context.trip.date_to.substring(0, 7);

    try {
      const roundTrip = await fetchPriceCalendar({
        origin,
        destination: context.selectedAirport.iata_code,
        departureMonth,
        oneWay: false,
      });

      const oneWayAB = await fetchPriceCalendar({
        origin,
        destination: context.selectedAirport.iata_code,
        departureMonth,
        oneWay: true,
      });

      const oneWayCA = await fetchPriceCalendar({
        origin: bestAlternative.iata_code,
        destination: origin,
        departureMonth: returnMonth,
        oneWay: true,
      });

      const roundTripPrices = roundTrip
        .map((o) => o.price_pln)
        .filter((p) => p > 0);
      const oneWayABPrices = oneWayAB
        .map((o) => o.price_pln)
        .filter((p) => p > 0);
      const oneWayCAPrices = oneWayCA
        .map((o) => o.price_pln)
        .filter((p) => p > 0);

      if (
        roundTripPrices.length === 0 ||
        oneWayABPrices.length === 0 ||
        oneWayCAPrices.length === 0
      ) {
        return [];
      }

      const roundTripMin = Math.min(...roundTripPrices);
      const oneWayABMin = Math.min(...oneWayABPrices);
      const oneWayCAMin = Math.min(...oneWayCAPrices);

      const openJawTotal = oneWayABMin + oneWayCAMin;
      const difference = openJawTotal - roundTripMin;

      if (difference > 300) return [];

      const distanceSavedKm =
        currentToFarthest - bestAlternative.distance_to_farthest;

      return [
        {
          category: "open_jaw",
          severity: "suggestion",
          title: `Open-jaw: wyląduj w ${context.selectedAirport.iata_code}, wróć z ${bestAlternative.iata_code}`,
          reasoning: `Twoja najdalsza atrakcja (${farthestAttraction.name}) to ${Math.round(currentToFarthest)} km od ${context.selectedAirport.iata_code}, ale tylko ${Math.round(bestAlternative.distance_to_farthest)} km od ${bestAlternative.iata_code}. Lot one-way A→B + one-way C→A: ~${openJawTotal} PLN. Round trip: ~${roundTripMin} PLN. Różnica ${difference > 0 ? `+${difference}` : difference} PLN - ${difference <= 0 ? "TANIEJ" : "minimalnie drożej"}, ale oszczędzasz ${Math.round(distanceSavedKm)} km jazdy ostatniego dnia.`,
          suggested_action: `Zarezerwuj dwie osobne nogi: ${origin}→${context.selectedAirport.iata_code} oraz ${bestAlternative.iata_code}→${origin}. Tylko ${context.selectedAttractions.length} dni na trasie zamiast cofania się.`,
          source_facts: {
            current_airport: context.selectedAirport.iata_code,
            alternative_airport: bestAlternative.iata_code,
            alternative_airport_name: bestAlternative.name,
            round_trip_pln: roundTripMin,
            open_jaw_total_pln: openJawTotal,
            distance_saved_km: Math.round(distanceSavedKm),
            farthest_attraction: farthestAttraction.name,
          },
          estimated_savings_pln: difference < 0 ? Math.abs(difference) : 0,
        },
      ];
    } catch (e) {
      console.error("Open-jaw price fetch failed:", e);
      return [];
    }
  },
};

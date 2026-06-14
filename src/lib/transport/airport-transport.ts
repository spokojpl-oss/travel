import { createAdminClient } from "@/lib/supabase/admin";
import { distanceKm } from "@/lib/search/geo-clustering";
import {
  buildWelcomePickupsDeepLink,
  buildKiwitaxiDeepLink,
  estimateTransferPrice,
} from "@/lib/api/travelpayouts-transfers";
import type { GeoPoint } from "@/types/domain";

export type TransportOption = {
  type: string;
  label: string;
  destination_area: string;
  distance_km: number | null;
  duration_minutes: number | null;
  price_min_pln: number;
  price_max_pln: number;
  total_for_group_pln: number | null;
  provider: string | null;
  deep_link: string | null;
  notes: string | null;
  source: "baseline" | "estimated" | "wikivoyage";
};

export async function getTransportOptionsFromAirport({
  airportIata,
  airportLat,
  airportLon,
  toLocation,
  toLat,
  toLon,
  date,
  passengers,
  includeCarRental = true,
}: {
  airportIata: string;
  airportLat: number;
  airportLon: number;
  toLocation: string;
  toLat: number;
  toLon: number;
  date: string;
  passengers: number;
  includeCarRental?: boolean;
}): Promise<TransportOption[]> {
  const supabase = createAdminClient();
  const options: TransportOption[] = [];

  const { data: baseline } = await supabase
    .from("airport_transport_baseline")
    .select("*")
    .eq("airport_iata", airportIata)
    .order("price_min_pln", { ascending: true });

  if (baseline) {
    for (const row of baseline) {
      const relevantArea = isAreaRelevant(row.destination_area, toLocation, {
        from: { lat: airportLat, lon: airportLon },
        to: { lat: toLat, lon: toLon },
      });

      if (!relevantArea) continue;

      const totalForGroup = calculateTotalForGroup({
        transportType: row.transport_type,
        passengers,
        priceMin: row.price_min_pln,
        priceMax: row.price_max_pln,
      });

      options.push({
        type: row.transport_type,
        label: `${capitalize(row.transport_type)}: ${row.provider_info ?? row.destination_area}`,
        destination_area: row.destination_area,
        distance_km: row.distance_km_approx
          ? Number(row.distance_km_approx)
          : null,
        duration_minutes: row.duration_minutes_approx,
        price_min_pln: row.price_min_pln,
        price_max_pln: row.price_max_pln,
        total_for_group_pln: totalForGroup,
        provider: row.provider_info,
        deep_link: null,
        notes: row.notes,
        source: "baseline",
      });
    }
  }

  const actualDistanceKm = distanceKm(
    { lat: airportLat, lon: airportLon },
    { lat: toLat, lon: toLon },
  );

  if (actualDistanceKm > 0) {
    const prices = estimateTransferPrice({
      distanceKm: actualDistanceKm,
      passengers,
    });

    const wpType =
      passengers <= 3 ? "sedan" : passengers <= 7 ? "minivan" : "minibus";
    const wpPrice =
      passengers <= 3
        ? prices.sedan_pln
        : passengers <= 7
          ? prices.minivan_pln
          : prices.minibus_pln;

    options.push({
      type: "transfer",
      label: `Welcome Pickups (${wpType})`,
      destination_area: toLocation,
      distance_km: Math.round(actualDistanceKm),
      duration_minutes: Math.round(actualDistanceKm * 1.2),
      price_min_pln: Math.round(wpPrice * 0.85),
      price_max_pln: Math.round(wpPrice * 1.15),
      total_for_group_pln: wpPrice,
      provider: "Welcome Pickups",
      deep_link: buildWelcomePickupsDeepLink({
        airportIata,
        toAddress: toLocation,
        date,
        passengers,
      }),
      notes: "Prebook online, kierowca czeka z tabliczką",
      source: "estimated",
    });

    options.push({
      type: "transfer",
      label: `Kiwitaxi (${wpType})`,
      destination_area: toLocation,
      distance_km: Math.round(actualDistanceKm),
      duration_minutes: Math.round(actualDistanceKm * 1.2),
      price_min_pln: Math.round(wpPrice * 0.8),
      price_max_pln: Math.round(wpPrice * 1.1),
      total_for_group_pln: Math.round(wpPrice * 0.95),
      provider: "Kiwitaxi",
      deep_link: buildKiwitaxiDeepLink({
        fromIata: airportIata,
        toCity: toLocation,
        toLat,
        toLon,
        date,
        passengers,
      }),
      notes: "Alternatywny prebook transfer",
      source: "estimated",
    });
  }

  if (includeCarRental) {
    options.push({
      type: "rental_car",
      label: "Wynajem auta na lotnisku",
      destination_area: "Dowolne",
      distance_km: null,
      duration_minutes: null,
      price_min_pln: 100,
      price_max_pln: 400,
      total_for_group_pln: null,
      provider: "DiscoverCars (Hertz, Europcar, SIXT, Avis)",
      deep_link: null,
      notes:
        "Najlepsza opcja gdy planujesz codzienne wyjazdy do różnych atrakcji",
      source: "baseline",
    });
  }

  return options;
}

function isAreaRelevant(
  baselineArea: string,
  userDestination: string,
  geo: { from: GeoPoint; to: GeoPoint },
): boolean {
  const dist = distanceKm(geo.from, geo.to);

  if (/cał|all|whole/i.test(baselineArea)) return true;

  if (/centrum|center|downtown/i.test(baselineArea)) {
    return dist < 30;
  }

  const baselineLower = baselineArea.toLowerCase();
  const destLower = userDestination.toLowerCase();
  if (baselineLower.includes(destLower) || destLower.includes(baselineLower)) {
    return true;
  }

  return true;
}

function calculateTotalForGroup({
  transportType,
  passengers,
  priceMin,
  priceMax,
}: {
  transportType: string;
  passengers: number;
  priceMin: number;
  priceMax: number;
}): number | null {
  if (["bus", "train", "metro", "shuttle"].includes(transportType)) {
    return Math.round(((priceMin + priceMax) / 2) * passengers);
  }

  if (["taxi", "transfer"].includes(transportType)) {
    if (transportType === "taxi" && passengers > 4) {
      const vehiclesNeeded = Math.ceil(passengers / 4);
      return Math.round(((priceMin + priceMax) / 2) * vehiclesNeeded);
    }
    return Math.round((priceMin + priceMax) / 2);
  }

  return null;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

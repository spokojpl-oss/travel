import { distanceKm } from "@/lib/search/geo-clustering";
import type { GeoPoint } from "@/types/domain";

export type AmenityFlags = {
  parking?: "free" | "paid" | "none";
  parking_price_per_night_eur?: number;
  breakfast?: "included" | "extra" | "none";
  breakfast_price_per_person_eur?: number;
};

export type CostCalculationInput = {
  hotel: {
    lat: number;
    lon: number;
    base_price_total_pln: number;
    amenities: AmenityFlags;
  };
  attractions: Array<{ lat: number; lon: number }>;
  nights: number;
  group_size: number;
  has_rental_car: boolean;
  fuel_price_pln_per_liter?: number;
  fuel_consumption?: number;
  eur_pln_rate: number;
};

export type CostBreakdown = {
  base_accommodation_pln: number;
  parking_pln: number;
  breakfast_pln: number;
  transport_to_attractions_pln: number;
  total_pln: number;
  per_person_total_pln: number;
  per_person_per_night_pln: number;
  notes: string[];
};

const DEFAULT_FUEL_PRICE = 6.5;
const DEFAULT_CONSUMPTION = 7;
const DEFAULT_BREAKFAST_PRICE_EUR = 12;

export function calculateRealTotalCost(
  input: CostCalculationInput,
): CostBreakdown {
  const notes: string[] = [];
  const fuelPrice = input.fuel_price_pln_per_liter ?? DEFAULT_FUEL_PRICE;
  const consumption = input.fuel_consumption ?? DEFAULT_CONSUMPTION;

  const base = input.hotel.base_price_total_pln;

  let parkingTotal = 0;
  if (input.has_rental_car) {
    if (input.hotel.amenities.parking === "paid") {
      const pricePerNight =
        (input.hotel.amenities.parking_price_per_night_eur ?? 15) *
        input.eur_pln_rate;
      parkingTotal = Math.round(pricePerNight * input.nights);
      notes.push(`Parking płatny: ~${Math.round(pricePerNight)} PLN/noc`);
    } else if (input.hotel.amenities.parking === "none") {
      parkingTotal = Math.round(10 * input.eur_pln_rate * input.nights);
      notes.push(
        "Brak parkingu w hotelu, szacowany koszt parkingu ulicznego/płatnego",
      );
    }
  }

  let breakfastTotal = 0;
  if (input.hotel.amenities.breakfast !== "included") {
    const pricePerPerson =
      (input.hotel.amenities.breakfast_price_per_person_eur ??
        DEFAULT_BREAKFAST_PRICE_EUR) * input.eur_pln_rate;
    breakfastTotal = Math.round(
      pricePerPerson * input.group_size * input.nights,
    );
    notes.push(
      `Śniadanie nie w cenie (~${Math.round(pricePerPerson)} PLN/os/dzień), opcja: kuchnia w apartamencie zamiast`,
    );
  }

  let transportTotal = 0;
  if (input.attractions.length > 0) {
    const hotelPoint: GeoPoint = {
      lat: input.hotel.lat,
      lon: input.hotel.lon,
    };
    const totalKm = input.attractions.reduce(
      (s, a) => s + distanceKm(hotelPoint, { lat: a.lat, lon: a.lon }) * 2,
      0,
    );

    if (input.has_rental_car) {
      const liters = (totalKm * consumption) / 100;
      transportTotal = Math.round(liters * fuelPrice);
      if (totalKm > 50) {
        notes.push(
          `Łącznie ~${Math.round(totalKm)} km jazdy do atrakcji (round-trip), paliwo ~${transportTotal} PLN`,
        );
      }
    } else {
      transportTotal = Math.round(totalKm * 3);
      notes.push(
        `Bez auta - łącznie ~${Math.round(totalKm)} km, szacowany koszt taxi ~${transportTotal} PLN (rozważ wynajem)`,
      );
    }
  }

  const total = base + parkingTotal + breakfastTotal + transportTotal;
  const perPerson = Math.round(total / input.group_size);
  const perPersonPerNight = Math.round(perPerson / input.nights);

  return {
    base_accommodation_pln: base,
    parking_pln: parkingTotal,
    breakfast_pln: breakfastTotal,
    transport_to_attractions_pln: transportTotal,
    total_pln: total,
    per_person_total_pln: perPerson,
    per_person_per_night_pln: perPersonPerNight,
    notes,
  };
}

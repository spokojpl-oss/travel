import { createAdminClient } from "@/lib/supabase/admin";
import {
  lookupHotellookLocation,
  fetchHotelsForLocation,
  persistHotelsAndOffers,
} from "@/lib/api/hotellook";
import {
  calculateProximity,
  computeAttractionsCentroid,
  type AttractionWithLocation,
} from "./proximity";
import {
  recommendPropertyType,
  type PropertyTypeRecommendation,
  type GroupComposition,
} from "./property-type-recommender";
import { calculateRealTotalCost, type CostBreakdown } from "./total-cost-calculator";
import type { AmenityFlags } from "./total-cost-calculator";
import type { Destination } from "@/types/domain";

export type HotelSearchInput = {
  destination: Destination;
  selectedAttractions: AttractionWithLocation[];
  checkIn: string;
  checkOut: string;
  group: GroupComposition;
  hasRentalCar: boolean;
  propertyTypeFilter?: "all" | "hotel" | "apartment" | "villa";
  minStars?: number;
  maxPriceTotal?: number;
  limit?: number;
};

export type EnrichedHotelOffer = {
  hotel: {
    id: string;
    external_id: string;
    name: string;
    lat: number;
    lon: number;
    stars: number | null;
    address: string | null;
    property_type: string | null;
  };
  offer: {
    price_total_pln: number;
    price_per_night_pln: number;
    nights: number;
    deep_link: string;
  };
  proximity: {
    avg_distance_km: number;
    closest: { name: string; distance_km: number };
    farthest: { name: string; distance_km: number };
  };
  real_cost: CostBreakdown;
  score: number;
};

export type HotelSearchResult = {
  hotels: EnrichedHotelOffer[];
  property_type_recommendation: PropertyTypeRecommendation;
  meta: {
    destination_name: string;
    centroid: { lat: number; lon: number } | null;
    total_found: number;
    after_filter: number;
    used_location_name: string;
  };
};

export async function searchHotels(
  input: HotelSearchInput,
): Promise<HotelSearchResult> {
  const nights = Math.round(
    (new Date(input.checkOut).getTime() - new Date(input.checkIn).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  const supabase = createAdminClient();
  const attractionIds = input.selectedAttractions.map((a) => a.id);
  const { data: fullAttractions } = await supabase
    .from("attractions")
    .select("id, category, duration_minutes")
    .in("id", attractionIds);

  const recommendation = recommendPropertyType({
    attractions: fullAttractions ?? [],
    nights,
    group: input.group,
  });

  const centroid = computeAttractionsCentroid(input.selectedAttractions);
  let locationName = input.destination.name;

  if (centroid) {
    const locations = await lookupHotellookLocation({
      query: input.destination.name,
    });
    if (locations.length > 0) {
      const closest = locations
        .filter((l) => l.location?.lat && l.location?.lon)
        .map((l) => ({
          loc: l,
          dist: Math.hypot(
            l.location!.lat - centroid.lat,
            l.location!.lon - centroid.lon,
          ),
        }))
        .sort((a, b) => a.dist - b.dist)[0];

      if (closest) {
        locationName =
          closest.loc.fullName ?? closest.loc.name ?? input.destination.name;
      }
    }
  }

  const rawHotels = await fetchHotelsForLocation({
    locationName,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    adults: input.group.adults,
    children: input.group.children_ages.length,
    limit: 60,
  });

  await persistHotelsAndOffers({
    hotels: rawHotels,
    destinationId: input.destination.id,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    adults: input.group.adults,
    children: input.group.children_ages.length,
  });

  const externalIds = rawHotels.map((h) => h.external_id);
  const { data: hotelsInDb } = await supabase
    .from("hotels")
    .select("*")
    .eq("source", "hotellook")
    .in("external_id", externalIds);

  if (!hotelsInDb || hotelsInDb.length === 0) {
    return {
      hotels: [],
      property_type_recommendation: recommendation,
      meta: {
        destination_name: input.destination.name,
        centroid,
        total_found: 0,
        after_filter: 0,
        used_location_name: locationName,
      },
    };
  }

  const { data: offers } = await supabase
    .from("hotel_offers_cache")
    .select("*")
    .in(
      "hotel_id",
      hotelsInDb.map((h) => h.id),
    )
    .eq("check_in", input.checkIn)
    .eq("check_out", input.checkOut)
    .eq("adults", input.group.adults)
    .eq("children", input.group.children_ages.length);

  const offersByHotel = new Map(offers?.map((o) => [o.hotel_id, o]) ?? []);

  const proximityMap = calculateProximity({
    hotels: hotelsInDb.map((h) => ({
      id: h.id,
      lat: Number(h.lat),
      lon: Number(h.lon),
    })),
    attractions: input.selectedAttractions.map((a) => ({
      ...a,
      lat: Number(a.lat),
      lon: Number(a.lon),
    })),
  });

  const enriched: EnrichedHotelOffer[] = [];

  for (const hotel of hotelsInDb) {
    const offer = offersByHotel.get(hotel.id);
    if (!offer) continue;

    const proximity = proximityMap.get(hotel.id);
    if (!proximity) continue;

    if (input.minStars && (hotel.stars ?? 0) < input.minStars) continue;
    if (input.maxPriceTotal && offer.price_total_pln > input.maxPriceTotal) {
      continue;
    }
    if (input.propertyTypeFilter && input.propertyTypeFilter !== "all") {
      const pt = hotel.property_type ?? "hotel";
      if (input.propertyTypeFilter !== pt) continue;
    }

    const amenities = (hotel.amenities ?? {}) as AmenityFlags;

    const realCost = calculateRealTotalCost({
      hotel: {
        lat: Number(hotel.lat),
        lon: Number(hotel.lon),
        base_price_total_pln: offer.price_total_pln,
        amenities,
      },
      attractions: input.selectedAttractions.map((a) => ({
        lat: Number(a.lat),
        lon: Number(a.lon),
      })),
      nights,
      group_size: input.group.total,
      has_rental_car: input.hasRentalCar,
      eur_pln_rate: 4.35,
    });

    const priceScore = Math.max(0, 1 - (offer.price_per_night_pln - 200) / 1500);
    const distanceScore = Math.max(0, 1 - proximity.avg_distance_km / 50);
    const starsBonus = (hotel.stars ?? 3) / 5;
    const score = priceScore * 0.35 + distanceScore * 0.45 + starsBonus * 0.2;

    enriched.push({
      hotel: {
        id: hotel.id,
        external_id: hotel.external_id,
        name: hotel.name,
        lat: Number(hotel.lat),
        lon: Number(hotel.lon),
        stars: hotel.stars,
        address: hotel.address,
        property_type: hotel.property_type,
      },
      offer: {
        price_total_pln: offer.price_total_pln,
        price_per_night_pln: offer.price_per_night_pln,
        nights: offer.nights,
        deep_link: offer.deep_link,
      },
      proximity: {
        avg_distance_km: proximity.avg_distance_km,
        closest: proximity.closest_attraction,
        farthest: proximity.farthest_attraction,
      },
      real_cost: realCost,
      score: Math.round(score * 1000) / 1000,
    });
  }

  enriched.sort((a, b) => b.score - a.score);
  const limit = input.limit ?? 20;

  return {
    hotels: enriched.slice(0, limit),
    property_type_recommendation: recommendation,
    meta: {
      destination_name: input.destination.name,
      centroid,
      total_found: rawHotels.length,
      after_filter: enriched.length,
      used_location_name: locationName,
    },
  };
}

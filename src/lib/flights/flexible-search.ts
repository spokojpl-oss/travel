import {
  fetchPriceCalendar,
  type FlightOffer,
} from "@/lib/api/travelpayouts";

export type DateRange = {
  start: string;
  end: string;
};

export type FlexibleSearchInput = {
  origins: string[];
  destinations: string[];
  departureDateRange: DateRange;
  tripLengthDays?: { min: number; max: number };
  passengers?: { adults: number; children: number; infants: number };
};

export type FlexibleSearchResult = {
  all_offers: FlightOffer[];
  cheapest: FlightOffer[];
  price_calendar: Array<{
    departure_date: string;
    min_price_pln: number;
    best_origin: string;
    best_destination: string;
    sample_offer: FlightOffer;
  }>;
  suggestions: Array<{
    type: "shift_dates";
    message: string;
    savings_pln: number;
  }>;
};

export async function flexibleFlightSearch(
  input: FlexibleSearchInput,
): Promise<FlexibleSearchResult> {
  const startDate = new Date(input.departureDateRange.start);
  const endDate = new Date(input.departureDateRange.end);

  const months = new Set<string>();
  const current = new Date(startDate);
  while (current <= endDate) {
    months.add(current.toISOString().substring(0, 7));
    current.setMonth(current.getMonth() + 1);
  }

  const allOffers: FlightOffer[] = [];
  const promises: Promise<FlightOffer[]>[] = [];

  for (const origin of input.origins) {
    for (const destination of input.destinations) {
      for (const month of months) {
        promises.push(
          fetchPriceCalendar({
            origin,
            destination,
            departureMonth: month,
            oneWay: !input.tripLengthDays,
            passengers: input.passengers,
          }).catch((e) => {
            console.warn(
              `Failed ${origin}->${destination} ${month}:`,
              e instanceof Error ? e.message : e,
            );
            return [];
          }),
        );
      }
    }
  }

  const batchSize = 5;
  for (let i = 0; i < promises.length; i += batchSize) {
    const batch = promises.slice(i, i + batchSize);
    const results = await Promise.all(batch);
    allOffers.push(...results.flat());
    if (i + batchSize < promises.length) {
      await sleep(500);
    }
  }

  const filtered = allOffers.filter((o) => {
    const dep = o.departure_date;
    return (
      dep >= input.departureDateRange.start &&
      dep <= input.departureDateRange.end
    );
  });

  const cheapest = [...filtered]
    .sort((a, b) => a.price_pln - b.price_pln)
    .slice(0, 5);

  const priceMatrix = new Map<string, FlightOffer>();
  for (const offer of filtered) {
    const existing = priceMatrix.get(offer.departure_date);
    if (!existing || offer.price_pln < existing.price_pln) {
      priceMatrix.set(offer.departure_date, offer);
    }
  }

  const priceCalendar = Array.from(priceMatrix.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, offer]) => ({
      departure_date: date,
      min_price_pln: offer.price_pln,
      best_origin: offer.origin_iata,
      best_destination: offer.destination_iata,
      sample_offer: offer,
    }));

  const suggestions = buildSuggestions(priceCalendar);

  return {
    all_offers: filtered,
    cheapest,
    price_calendar: priceCalendar,
    suggestions,
  };
}

function buildSuggestions(
  calendar: FlexibleSearchResult["price_calendar"],
): FlexibleSearchResult["suggestions"] {
  if (calendar.length < 3) return [];

  const cheapest = calendar.reduce((min, curr) =>
    curr.min_price_pln < min.min_price_pln ? curr : min,
  );
  const expensive = calendar.reduce((max, curr) =>
    curr.min_price_pln > max.min_price_pln ? curr : max,
  );

  const suggestions: FlexibleSearchResult["suggestions"] = [];
  const savings = expensive.min_price_pln - cheapest.min_price_pln;

  if (savings >= 200) {
    suggestions.push({
      type: "shift_dates",
      message: `Najtaniej ${cheapest.departure_date} (${cheapest.min_price_pln} PLN). Najdrożej ${expensive.departure_date} (${expensive.min_price_pln} PLN). Różnica: ${savings} PLN/os.`,
      savings_pln: savings,
    });
  }

  const avgPrice =
    calendar.reduce((sum, d) => sum + d.min_price_pln, 0) / calendar.length;
  if (avgPrice - cheapest.min_price_pln > 100) {
    suggestions.push({
      type: "shift_dates",
      message: `Wybierając ${cheapest.departure_date} oszczędzasz ${Math.round(avgPrice - cheapest.min_price_pln)} PLN/os względem średniej w zakresie.`,
      savings_pln: Math.round(avgPrice - cheapest.min_price_pln),
    });
  }

  return suggestions;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

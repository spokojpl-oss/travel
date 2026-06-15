"use client";

import { useEffect, useState } from "react";
import type { Attraction } from "@/types/domain";
import { RefineInput } from "@/components/features/RefineInput";
import { SkeletonList } from "@/components/ui/Skeleton";
import { HotelCard } from "@/components/features/HotelCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { defaultDateRangeFromToday } from "@/lib/search/trip-context";
import { readApiError } from "@/lib/utils/api-response";

type HotelSearchResult = {
  hotels: Array<{
    hotel: {
      id: string;
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
    real_cost: {
      total_pln: number;
      per_person_per_night_pln: number;
      notes: string[];
    };
    score: number;
  }>;
  property_type_recommendation: {
    recommended_type: string;
    confidence: string;
    reasoning: string;
    metrics: {
      hours_per_day_outside: number;
      pct_day_outside: number;
      nights: number;
      group_size: number;
    };
  };
  meta: {
    total_found: number;
    after_filter: number;
    used_location_name: string;
    warning?: string;
    fallback_used?: boolean;
    oldest_fetched_at?: string;
    booking_fallback_url?: string;
    hotellook_unavailable?: boolean;
  };
};

export function HotelsSection({
  destinationId,
  attractions,
  checkIn: initialCheckIn,
  checkOut: initialCheckOut,
  adults: initialAdults = 2,
  childrenAges: initialChildrenAges = [],
}: {
  destinationId: string;
  attractions: Pick<Attraction, "id" | "name">[];
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  childrenAges?: number[];
}) {
  const defaults = defaultDateRangeFromToday(30, 7);
  const resolvedCheckIn = initialCheckIn || defaults.from;
  const resolvedCheckOut = initialCheckOut || defaults.to;

  const [selectedAttractionIds, setSelectedAttractionIds] = useState<Set<string>>(
    new Set(attractions.slice(0, 10).map((a) => a.id)),
  );
  const [checkIn, setCheckIn] = useState(resolvedCheckIn);
  const [checkOut, setCheckOut] = useState(resolvedCheckOut);
  const [adults, setAdults] = useState(initialAdults);
  const [childrenAges, setChildrenAges] = useState(
    initialChildrenAges.length > 0 ? initialChildrenAges.join(", ") : "",
  );
  const [hasRentalCar, setHasRentalCar] = useState(true);
  const [propertyFilter, setPropertyFilter] = useState<
    "all" | "hotel" | "apartment" | "villa"
  >("all");
  const [results, setResults] = useState<HotelSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {  }, [initialCheckIn, initialCheckOut, checkIn, checkOut, adults]);

  useEffect(() => {
    if (attractions.length > 0 && selectedAttractionIds.size === 0) {
      setSelectedAttractionIds(
        new Set(attractions.slice(0, 10).map((a) => a.id)),
      );
    }
  }, [attractions]);

  function toggleAttraction(id: string) {
    const next = new Set(selectedAttractionIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAttractionIds(next);
  }

  function buildSearchParams() {
    const ages = childrenAges
      .split(",")
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n));
    return {
      destination_id: destinationId,
      selected_attraction_ids: Array.from(selectedAttractionIds),
      check_in: checkIn,
      check_out: checkOut,
      adults,
      children_ages: ages,
      has_rental_car: hasRentalCar,
      property_type_filter: propertyFilter,
    };
  }

  async function handleSearch(
    override?: ReturnType<typeof buildSearchParams>,
  ) {
    const params = override ?? buildSearchParams();
    if (params.selected_attraction_ids.length === 0) {
      setError("Wybierz co najmniej 1 atrakcję");
      return;
    }
    if (override) {
      setSelectedAttractionIds(new Set(params.selected_attraction_ids));
      setCheckIn(params.check_in);
      setCheckOut(params.check_out);
      setAdults(params.adults);
      setChildrenAges(params.children_ages.join(", "));
      setHasRentalCar(params.has_rental_car);
      setPropertyFilter(params.property_type_filter);
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search/hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res));
      }
      setResults(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  if (attractions.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader title="Hotele blisko atrakcji" />
        <CardBody>
          <p className="text-sm text-text-secondary">
            Brak atrakcji dla tej destynacji. Zbuduj stronę destynacji ponownie z
            wyszukiwarki.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader title="Hotele blisko Twoich atrakcji" />
      <CardBody>
      <p className="mb-4 text-sm text-text-secondary">
        Hotele wyszukiwane wokół wybranych atrakcji, nie centrum destynacji.
      </p>

      <div className="mb-4">
        <p className="text-sm font-medium mb-2">
          Wybierz atrakcje (hotele wokół nich):
        </p>
        <div className="max-h-40 overflow-y-auto text-sm space-y-1">
          {attractions.slice(0, 20).map((a) => (
            <label key={a.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedAttractionIds.has(a.id)}
                onChange={() => toggleAttraction(a.id)}
              />
              {a.name}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end mb-4 text-sm">
        <label>
          Check-in:{" "}
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </label>
        <label>
          Check-out:{" "}
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </label>
        <label>
          Dorośli:{" "}
          <input
            type="number"
            min={1}
            max={20}
            value={adults}
            onChange={(e) => setAdults(Number(e.target.value))}
            className="border px-2 py-1 rounded w-16"
          />
        </label>
        <label>
          Wiek dzieci:{" "}
          <input
            type="text"
            placeholder="np. 8, 11"
            value={childrenAges}
            onChange={(e) => setChildrenAges(e.target.value)}
            className="border px-2 py-1 rounded w-24"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3 items-center mb-4 text-sm">
        <label>
          Typ:{" "}
          <select
            value={propertyFilter}
            onChange={(e) =>
              setPropertyFilter(e.target.value as typeof propertyFilter)
            }
            className="border px-2 py-1 rounded"
          >
            <option value="all">Wszystkie</option>
            <option value="hotel">Tylko hotele</option>
            <option value="apartment">Tylko apartamenty</option>
            <option value="villa">Tylko wille</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={hasRentalCar}
            onChange={(e) => setHasRentalCar(e.target.checked)}
          />
          Mam/będę miał wynajęte auto
        </label>
        <Button
          onClick={() => handleSearch()}
          disabled={loading || !checkIn || !checkOut}
          size="sm"
        >
          {loading ? "Szukam..." : "Szukaj noclegów"}
        </Button>
      </div>

      <RefineInput
        searchType="hotels"
        currentParams={buildSearchParams()}
        onApply={(newParams) => {
          handleSearch({
            destination_id: destinationId,
            selected_attraction_ids: Array.isArray(
              newParams.selected_attraction_ids,
            )
              ? (newParams.selected_attraction_ids as string[])
              : Array.from(selectedAttractionIds),
            check_in: (newParams.check_in as string) ?? checkIn,
            check_out: (newParams.check_out as string) ?? checkOut,
            adults: (newParams.adults as number) ?? adults,
            children_ages: Array.isArray(newParams.children_ages)
              ? (newParams.children_ages as number[])
              : childrenAges
                  .split(",")
                  .map((s) => parseInt(s.trim()))
                  .filter((n) => !isNaN(n)),
            has_rental_car:
              typeof newParams.has_rental_car === "boolean"
                ? newParams.has_rental_car
                : hasRentalCar,
            property_type_filter:
              (newParams.property_type_filter as typeof propertyFilter) ??
              propertyFilter,
          });
        }}
      />

      {error && <p className="text-red-600 mb-4">Błąd: {error}</p>}

      {loading && <SkeletonList count={4} />}

      {results && !loading && (
        <div className="space-y-4 text-sm">
          {results.meta.warning && (
            <p className="text-amber-700 border p-2 rounded bg-amber-50">
              {results.meta.warning}
              {results.meta.booking_fallback_url && (
                <a
                  href={results.meta.booking_fallback_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block font-semibold text-brand-700 hover:underline"
                >
                  Szukaj na Booking.com →
                </a>
              )}
              {results.meta.oldest_fetched_at && (
                <span className="block text-xs mt-1">
                  Ostatnia aktualizacja cache:{" "}
                  {new Date(results.meta.oldest_fetched_at).toLocaleString(
                    "pl-PL",
                  )}
                </span>
              )}
            </p>
          )}

          <div className="border p-3 rounded bg-gray-50">
            <h3 className="font-medium mb-1">Rekomendacja typu noclegu</h3>
            <p>
              <strong>Sugestia:</strong>{" "}
              {translateRecommendation(
                results.property_type_recommendation.recommended_type,
              )}{" "}
              ({results.property_type_recommendation.confidence})
            </p>
            <p className="mt-1">{results.property_type_recommendation.reasoning}</p>
            <p className="text-gray-600 mt-1 text-xs">
              {results.property_type_recommendation.metrics.hours_per_day_outside}h
              dziennie poza hotelem (
              {results.property_type_recommendation.metrics.pct_day_outside}% dnia),{" "}
              {results.property_type_recommendation.metrics.group_size} osób,{" "}
              {results.property_type_recommendation.metrics.nights} nocy
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-1">
              Wyniki ({results.meta.after_filter}/{results.meta.total_found} w
              Hotellook: {results.meta.used_location_name})
            </h3>

            {results.hotels.length === 0 ? (
              <p>
                Brak hoteli dla zadanych kryteriów.
                {results.meta.booking_fallback_url && (
                  <>
                    {" "}
                    <a
                      href={results.meta.booking_fallback_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      Szukaj na Booking.com
                    </a>
                  </>
                )}
              </p>
            ) : (
              <div className="space-y-2">
                {results.hotels.map((h) => (
                  <div key={h.hotel.id}>
                    <HotelCard
                      hotel={h.hotel}
                      offer={h.offer}
                      proximity={h.proximity}
                    />
                    <details className="mb-4 ml-1 text-xs text-text-secondary">
                      <summary className="cursor-pointer">
                        Real total cost: {h.real_cost.total_pln} PLN (
                        {h.real_cost.per_person_per_night_pln} PLN/os/noc) ·
                        dopasowanie: {h.score}
                      </summary>
                      <ul className="mt-1 list-disc pl-5">
                        {h.real_cost.notes.map((n, j) => (
                          <li key={j}>{n}</li>
                        ))}
                      </ul>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      </CardBody>
    </Card>
  );
}

function translateRecommendation(type: string): string {
  switch (type) {
    case "apartment_or_villa":
      return "Apartament lub willa";
    case "hotel":
      return "Hotel";
    case "either":
      return "Hotel lub apartament (oba sensowne)";
    default:
      return type;
  }
}

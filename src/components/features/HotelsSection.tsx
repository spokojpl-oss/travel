"use client";

import { useEffect, useState } from "react";
import type { Attraction } from "@/types/domain";

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
  };
};

export function HotelsSection({
  destinationId,
  attractions,
}: {
  destinationId: string;
  attractions: Pick<Attraction, "id" | "name">[];
}) {
  const [selectedAttractionIds, setSelectedAttractionIds] = useState<Set<string>>(
    new Set(attractions.slice(0, 10).map((a) => a.id)),
  );
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [childrenAges, setChildrenAges] = useState("");
  const [hasRentalCar, setHasRentalCar] = useState(true);
  const [propertyFilter, setPropertyFilter] = useState<
    "all" | "hotel" | "apartment" | "villa"
  >("all");
  const [results, setResults] = useState<HotelSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() + 30);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    setCheckIn(start.toISOString().split("T")[0]);
    setCheckOut(end.toISOString().split("T")[0]);
  }, []);

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

  async function handleSearch() {
    if (selectedAttractionIds.size === 0) {
      setError("Wybierz co najmniej 1 atrakcję");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ages = childrenAges
        .split(",")
        .map((s) => parseInt(s.trim()))
        .filter((n) => !isNaN(n));

      const res = await fetch("/api/search/hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination_id: destinationId,
          selected_attraction_ids: Array.from(selectedAttractionIds),
          check_in: checkIn,
          check_out: checkOut,
          adults,
          children_ages: ages,
          has_rental_car: hasRentalCar,
          property_type_filter: propertyFilter,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(
          typeof err.error === "string" ? err.error : "Search failed",
        );
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
      <section className="mb-8 border p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Hotele blisko atrakcji</h2>
        <p className="text-sm text-gray-600">
          Brak atrakcji dla tej destynacji. Zbuduj stronę destynacji ponownie z
          wyszukiwarki.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-8 border p-4 rounded">
      <h2 className="text-lg font-semibold mb-3">Hotele blisko Twoich atrakcji</h2>
      <p className="text-sm text-gray-600 mb-4">
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
        <button
          onClick={handleSearch}
          disabled={loading || !checkIn || !checkOut}
          className="border px-3 py-1 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? "Szukam..." : "Szukaj noclegów"}
        </button>
      </div>

      {error && <p className="text-red-600 mb-4">Błąd: {error}</p>}

      {results && (
        <div className="space-y-4 text-sm">
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
                Brak hoteli dla zadanych kryteriów. Spróbuj zmienić filtry lub
                zwiększyć budżet.
              </p>
            ) : (
              <ol className="space-y-3 list-none">
                {results.hotels.map((h, i) => (
                  <li key={h.hotel.id} className="border p-3 rounded">
                    <h4 className="font-medium">
                      {i + 1}. {h.hotel.name}{" "}
                      {h.hotel.stars ? "★".repeat(h.hotel.stars) : ""}
                      <span className="text-gray-500 font-normal ml-2">
                        (dopasowanie: {h.score})
                      </span>
                    </h4>
                    {h.hotel.address && (
                      <p className="text-gray-600">{h.hotel.address}</p>
                    )}

                    <p className="mt-1">
                      <strong>{h.offer.price_total_pln} PLN</strong> za{" "}
                      {h.offer.nights} nocy ({h.offer.price_per_night_pln} PLN/noc)
                    </p>

                    <p className="mt-1 text-gray-700">
                      Odległość do atrakcji: średnio {h.proximity.avg_distance_km}{" "}
                      km · najbliżej {h.proximity.closest.name} (
                      {h.proximity.closest.distance_km} km) · najdalej{" "}
                      {h.proximity.farthest.name} ({h.proximity.farthest.distance_km}{" "}
                      km)
                    </p>

                    <details className="mt-2">
                      <summary>
                        Real total cost: {h.real_cost.total_pln} PLN (
                        {h.real_cost.per_person_per_night_pln} PLN/os/noc)
                      </summary>
                      <ul className="list-disc pl-5 mt-1 text-xs text-gray-600">
                        {h.real_cost.notes.map((n, j) => (
                          <li key={j}>{n}</li>
                        ))}
                      </ul>
                    </details>

                    <a
                      href={h.offer.deep_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 underline"
                    >
                      Zobacz na Hotellook / Booking →
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </section>
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

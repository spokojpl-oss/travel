"use client";

import { useEffect, useState } from "react";

type DestinationAirport = {
  iata_code: string;
  name: string;
  city: string | null;
  distance_km: number;
};

type VehicleRecommendation = {
  configuration: string;
  vehicles: Array<{
    name_pl: string;
    seats: number;
    estimated_daily_eur: number;
  }>;
  total_capacity: number;
  baggage_capacity: number;
  estimated_daily_total_pln: number;
  estimated_total_for_period_pln: number;
  pros: string[];
  cons: string[];
  is_recommended: boolean;
  reasoning: string;
  discover_cars_link: string | null;
};

type TransportOption = {
  type: string;
  label: string;
  distance_km: number | null;
  duration_minutes: number | null;
  price_min_pln: number;
  price_max_pln: number;
  total_for_group_pln: number | null;
  provider: string | null;
  deep_link: string | null;
  notes: string | null;
};

type TransportSearchResult = {
  airport: { iata: string; name: string; city: string | null };
  duration_days: number;
  transport_from_airport: TransportOption[];
  vehicle_recommendations: VehicleRecommendation[];
  meta: { total_passengers: number; children_under_12: number };
};

type Props = {
  destinationId: string;
  destinationLat: number;
  destinationLon: number;
  destinationName: string;
  pickupDate?: string;
  returnDate?: string;
  adults?: number;
  childrenAges?: number[];
};

export function TransportSection({
  destinationId,
  destinationLat,
  destinationLon,
  destinationName,
  pickupDate: initialPickup,
  returnDate: initialReturn,
  adults = 2,
  childrenAges = [],
}: Props) {
  const [airports, setAirports] = useState<DestinationAirport[]>([]);
  const [airportIata, setAirportIata] = useState("");
  const [pickupDate, setPickupDate] = useState(initialPickup ?? "");
  const [returnDate, setReturnDate] = useState(initialReturn ?? "");
  const [hasSportsBaggage, setHasSportsBaggage] = useState(false);
  const [results, setResults] = useState<TransportSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pickupDate) {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() + 30);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      setPickupDate(start.toISOString().split("T")[0]);
      setReturnDate(end.toISOString().split("T")[0]);
    }
  }, [pickupDate]);

  useEffect(() => {
    fetch(`/api/destination/${destinationId}/airports`)
      .then((res) => res.json())
      .then((data: { airports?: DestinationAirport[] }) => {
        if (data.airports && data.airports.length > 0) {
          setAirports(data.airports);
          setAirportIata(data.airports[0].iata_code);
        }
      })
      .catch(() => {
        /* airports optional */
      });
  }, [destinationId]);

  async function handleSearch() {
    if (!airportIata) {
      setError("Brak lotniska dla tej destynacji");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          airport_iata: airportIata,
          destination_id: destinationId,
          to_location_name: destinationName,
          to_lat: destinationLat,
          to_lon: destinationLon,
          pickup_date: pickupDate,
          return_date: returnDate,
          adults,
          children_ages: childrenAges,
          has_sports_baggage: hasSportsBaggage,
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
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const totalPassengers = adults + childrenAges.length;

  if (airports.length === 0) {
    return (
      <section className="mb-8 border p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Auto + Transport z lotniska</h2>
        <p className="text-sm text-gray-600">
          Brak lotnisk w pobliżu destynacji. Uruchom seed lotnisk w Supabase.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-8 border p-4 rounded">
      <h2 className="text-lg font-semibold mb-3">Auto + Transport z lotniska</h2>

      <div className="flex flex-wrap gap-3 items-end mb-4 text-sm">
        <label>
          Lotnisko:{" "}
          <select
            value={airportIata}
            onChange={(e) => setAirportIata(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            {airports.map((a) => (
              <option key={a.iata_code} value={a.iata_code}>
                {a.iata_code} – {a.name} ({Math.round(a.distance_km)} km)
              </option>
            ))}
          </select>
        </label>
        <label>
          Pickup:{" "}
          <input
            type="date"
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </label>
        <label>
          Return:{" "}
          <input
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={hasSportsBaggage}
            onChange={(e) => setHasSportsBaggage(e.target.checked)}
          />
          Sprzęt sportowy (rowery, deski)
        </label>
        <button
          onClick={handleSearch}
          disabled={loading || !pickupDate || !returnDate}
          className="border px-3 py-1 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? "Szukam..." : "Pokaż opcje"}
        </button>
      </div>

      <p className="text-xs text-gray-600 mb-4">
        Grupa: {totalPassengers} osób ({adults} dorosłych + {childrenAges.length}{" "}
        dzieci) · Cel: {destinationName}
      </p>

      {error && <p className="text-red-600 mb-4">Błąd: {error}</p>}

      {results && (
        <div className="space-y-6 text-sm">
          <div>
            <h3 className="font-medium mb-2">
              Wynajem auta ({results.duration_days} dni)
            </h3>
            <div className="space-y-3">
              {results.vehicle_recommendations.map((v, i) => (
                <article
                  key={i}
                  className={`border p-3 rounded ${v.is_recommended ? "bg-blue-50" : ""}`}
                >
                  <h4 className="font-medium">
                    {v.is_recommended && "⭐ "}
                    {formatConfiguration(v.configuration)}
                  </h4>
                  <p className="mt-1">{v.reasoning}</p>
                  <ul className="list-disc pl-5 mt-1">
                    {v.vehicles.map((vh, j) => (
                      <li key={j}>
                        {vh.name_pl} – {vh.seats} miejsc, ~{vh.estimated_daily_eur}
                        €/dzień
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2">
                    <strong>
                      Szacunkowo: {v.estimated_daily_total_pln} PLN/dzień,{" "}
                      {v.estimated_total_for_period_pln} PLN za cały okres
                    </strong>
                  </p>
                  <p className="text-gray-600 text-xs">
                    Pojemność: {v.total_capacity} osób, {v.baggage_capacity}{" "}
                    dużych walizek
                  </p>
                  <details className="mt-2">
                    <summary>Plusy/minusy</summary>
                    <p>
                      <strong>Plusy:</strong> {v.pros.join(", ")}
                    </p>
                    <p>
                      <strong>Minusy:</strong> {v.cons.join(", ") || "—"}
                    </p>
                  </details>
                  {v.discover_cars_link && (
                    <a
                      href={v.discover_cars_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 underline"
                    >
                      Sprawdź ceny na DiscoverCars →
                    </a>
                  )}
                </article>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">
              Transport z lotniska {results.airport.iata} ({results.airport.name})
              → {destinationName}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-2">Opcja</th>
                    <th className="py-2 pr-2">Dystans</th>
                    <th className="py-2 pr-2">Czas</th>
                    <th className="py-2 pr-2">Cena/grupę</th>
                    <th className="py-2 pr-2">Provider</th>
                    <th className="py-2">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {results.transport_from_airport.map((opt, i) => (
                    <tr key={i} className="border-b align-top">
                      <td className="py-2 pr-2">
                        <strong>{opt.label}</strong>
                        {opt.notes && (
                          <>
                            <br />
                            <span className="text-gray-600">{opt.notes}</span>
                          </>
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        {opt.distance_km ? `${opt.distance_km} km` : "—"}
                      </td>
                      <td className="py-2 pr-2">
                        {opt.duration_minutes
                          ? `${opt.duration_minutes} min`
                          : "—"}
                      </td>
                      <td className="py-2 pr-2">
                        {opt.total_for_group_pln
                          ? `${opt.total_for_group_pln} PLN`
                          : `${opt.price_min_pln}–${opt.price_max_pln} PLN`}
                      </td>
                      <td className="py-2 pr-2 text-gray-600">
                        {opt.provider ?? "—"}
                      </td>
                      <td className="py-2">
                        {opt.deep_link ? (
                          <a
                            href={opt.deep_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            Sprawdź →
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function formatConfiguration(config: string): string {
  switch (config) {
    case "single_vehicle":
      return "1 auto";
    case "two_vehicles":
      return "2 auta";
    case "three_vehicles":
      return "3 auta";
    case "transfer":
      return "Transfer z kierowcą";
    default:
      return config;
  }
}

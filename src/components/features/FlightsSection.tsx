"use client";

import { useState } from "react";
import { POLISH_AIRPORTS } from "@/lib/flights/polish-airports";
import { RefineInput } from "@/components/features/RefineInput";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Icon } from "@/components/ui/Icon";
import {
  daysBetweenIso,
  defaultDateRangeFromToday,
} from "@/lib/search/trip-context";
import { useT } from "@/i18n/locale-provider";

type FlightOffer = {
  origin_iata: string;
  destination_iata: string;
  price_pln: number;
  airline_code: string | null;
  departure_date: string;
  return_date: string | null;
  transfers: number;
  deep_link: string;
};

type PriceCalendarEntry = {
  departure_date: string;
  min_price_pln: number;
  best_origin: string;
  best_destination: string;
  sample_offer: FlightOffer;
};

type FlightSearchResult = {
  result: {
    all_offers: FlightOffer[];
    cheapest: FlightOffer[];
    price_calendar: PriceCalendarEntry[];
    suggestions: Array<{ type: string; message: string; savings_pln: number }>;
  };
  meta: {
    destination_id: string;
    destination_name: string;
    destination_airports: Array<{
      iata_code: string;
      name: string;
      city: string | null;
      distance_km: number;
    }>;
    searched_origins: string[];
    searched_destinations?: string[];
    gateway_airports?: string[];
    warning?: string;
    fallback_used?: boolean;
    oldest_fetched_at?: string;
  };
};

function polishAirportLabel(iata: string): string {
  const polish = POLISH_AIRPORTS[iata as keyof typeof POLISH_AIRPORTS];
  return polish ? `${iata} (${polish.name})` : iata;
}

export function FlightsSection({
  destinationId,
  departureDate,
  returnDate,
  origins,
  adults = 1,
  children = 0,
}: {
  destinationId: string;
  departureDate?: string;
  returnDate?: string | null;
  origins?: string[];
  adults?: number;
  children?: number;
}) {
  const t = useT();
  const defaults = defaultDateRangeFromToday(30, 14);
  const resolvedFrom = departureDate || defaults.from;
  const resolvedTo = returnDate || defaults.to;
  const resolvedLength = daysBetweenIso(resolvedFrom, resolvedTo);

  const [dateFrom, setDateFrom] = useState(resolvedFrom);
  const [dateTo, setDateTo] = useState(resolvedTo);
  const [tripLength, setTripLength] = useState(resolvedLength);
  const [results, setResults] = useState<FlightSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildSearchParams() {
    const resolvedOrigins = origins?.length ? origins : undefined;
    return {
      destination_id: destinationId,
      departure_date_from: dateFrom,
      departure_date_to: dateTo,
      trip_length_min_days: tripLength,
      trip_length_max_days: tripLength,
      adults,
      children,
      infants: 0,
      ...(resolvedOrigins
        ? {
            origins: resolvedOrigins,
            max_origins: resolvedOrigins.length,
          }
        : {}),
      max_destinations: 3,
    };
  }

  async function handleSearch(
    override?: ReturnType<typeof buildSearchParams>,
  ) {
    const params = override ?? buildSearchParams();
    if (override) {
      setDateFrom(params.departure_date_from);
      setDateTo(params.departure_date_to);
      setTripLength(params.trip_length_min_days);
    }
    setIsSearching(true);
    setError(null);
    try {
      const response = await fetch("/api/search/flights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(
          typeof err.error === "string" ? err.error : t("flights.searchFailed"),
        );
      }

      const data: FlightSearchResult = await response.json();
      setResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("flights.searchFailed"));
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <section className="mb-8 border p-4 rounded">
      <h2 className="text-lg font-semibold mb-3">{t("flights.title")}</h2>

      <div className="flex flex-wrap gap-3 items-end mb-4 text-sm">
        <label>
          {t("flights.departFrom")}{" "}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </label>
        <label>
          {t("flights.departTo")}{" "}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </label>
        <label>
          {t("flights.tripLength")}{" "}
          <input
            type="number"
            min={1}
            max={30}
            value={tripLength}
            onChange={(e) => setTripLength(Number(e.target.value))}
            className="border px-2 py-1 rounded w-16"
          />
        </label>
        <button
          onClick={() => handleSearch()}
          disabled={isSearching || !dateFrom || !dateTo}
          className="border px-3 py-1 rounded bg-black text-white disabled:opacity-50"
        >
          {isSearching ? t("flights.searching") : t("flights.search")}
        </button>
      </div>

      <RefineInput
        searchType="flights"
        currentParams={buildSearchParams()}
        onApply={(newParams) => {
          handleSearch({
            ...buildSearchParams(),
            departure_date_from:
              (newParams.departure_date_from as string) ?? dateFrom,
            departure_date_to:
              (newParams.departure_date_to as string) ?? dateTo,
            trip_length_min_days:
              (newParams.trip_length_min_days as number) ?? tripLength,
            trip_length_max_days:
              (newParams.trip_length_max_days as number) ?? tripLength,
            max_origins: newParams.max_origins as number | undefined,
            max_destinations: (newParams.max_destinations as number) ?? 3,
          });
        }}
      />

      {error && (
        <p className="text-red-600 mb-4">
          {t("flights.error")}: {error}
        </p>
      )}

      {isSearching && <SkeletonList count={4} />}

      {results && !isSearching && (
        <div className="space-y-4 text-sm">
          {results.meta.warning && (
            <p className="text-amber-700">
              {results.meta.warning}
              {results.meta.oldest_fetched_at && (
                <span className="block text-xs mt-1">
                  {t("flights.cacheUpdated")}{" "}
                  {new Date(results.meta.oldest_fetched_at).toLocaleString(
                    "pl-PL",
                  )}
                </span>
              )}
            </p>
          )}

          <div>
            <h3 className="font-medium mb-1">{t("flights.destAirports")}</h3>
            <ul className="list-disc pl-5">
              {(results.meta.destination_airports ?? []).map((a) => (
                <li key={a.iata_code}>
                  {a.iata_code} ({a.name}, {a.city ?? "-"}) –{" "}
                  {Math.round(a.distance_km)} km
                </li>
              ))}
            </ul>
            <p className="text-gray-600 mt-1">
              {t("flights.searchedFrom")}:{" "}
              {(results.meta.searched_origins ?? [])
                .map((iata) => polishAirportLabel(iata))
                .join(", ") || "—"}
            </p>
            {(results.meta.searched_destinations?.length ?? 0) > 0 && (
              <p className="text-gray-600 mt-1">
                {t("flights.searchedTo")}:{" "}
                {(results.meta.searched_destinations ?? []).join(", ")}
              </p>
            )}
            {(results.meta.gateway_airports?.length ?? 0) > 0 && (
              <p className="text-gray-600 mt-1 text-xs">
                {t("flights.gatewayNote")}
              </p>
            )}
          </div>

          {results.result.suggestions.length > 0 && (
            <div>
              <h3 className="font-medium mb-1">{t("flights.priceTips")}</h3>
              <ul className="list-disc pl-5">
                {results.result.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Icon name="lightbulb" size={14} className="mt-0.5 shrink-0 text-brand-700" />
                    {s.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="font-medium mb-1">{t("flights.cheapest")}</h3>
            {results.result.cheapest.length === 0 ? (
              <p>{t("flights.noResults")}</p>
            ) : (
              <ol className="space-y-2 list-decimal pl-5">
                {results.result.cheapest.map((o, i) => (
                  <li key={i}>
                    <strong>{o.price_pln} PLN</strong> –{" "}
                    {polishAirportLabel(o.origin_iata)} → {o.destination_iata}{" "}
                    ({o.airline_code ?? "—"}, {o.transfers}{" "}
                    {t("flights.stops")}) – {o.departure_date}
                    {o.return_date ? ` ↔ ${o.return_date}` : ""}{" "}
                    <a
                      href={o.deep_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {t("flights.viewOnAviasales")}
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {results.result.price_calendar.length > 0 && (
            <div>
              <h3 className="font-medium mb-1">
                {t("flights.priceCalendar")} ({results.result.price_calendar.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="py-1 pr-3">{t("flights.departDate")}</th>
                      <th className="py-1 pr-3">{t("flights.minPrice")}</th>
                      <th className="py-1 pr-3">{t("flights.fromAirport")}</th>
                      <th className="py-1 pr-3">{t("flights.toAirport")}</th>
                      <th className="py-1">{t("flights.link")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.result.price_calendar.map((c) => (
                      <tr key={c.departure_date} className="border-b">
                        <td className="py-1 pr-3">{c.departure_date}</td>
                        <td className="py-1 pr-3">{c.min_price_pln}</td>
                        <td className="py-1 pr-3">{c.best_origin}</td>
                        <td className="py-1 pr-3">{c.best_destination}</td>
                        <td className="py-1">
                          <a
                            href={c.sample_offer.deep_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            {t("flights.view")}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { TripComparison } from "@/lib/compare/trip-comparison";
import { SkeletonList } from "@/components/ui/Skeleton";

export default function ComparePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [comparison, setComparison] = useState<TripComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiVerdict, setAiVerdict] = useState<string | null>(null);
  const [tradeOffs, setTradeOffs] = useState<string[]>([]);
  const [generatingVerdict, setGeneratingVerdict] = useState(false);

  useEffect(() => {
    const ids = searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
    if (ids.length < 2) {
      setError("Wybierz minimum 2 tripy do porównania");
      setLoading(false);
      return;
    }
    loadComparison(ids);
  }, [searchParams]);

  async function loadComparison(ids: string[]) {
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip_ids: ids }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      const data = await res.json();
      setComparison(data.comparison);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function generateAiVerdict() {
    setGeneratingVerdict(true);
    const res = await fetch("/api/compare/verdict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trip_ids: comparison.map((c) => c.trip_id) }),
    });
    setGeneratingVerdict(false);
    if (res.ok) {
      const data = await res.json();
      setAiVerdict(data.verdict);
      setTradeOffs(data.trade_offs ?? []);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold mb-4">Porównanie tripów</h1>
        <SkeletonList count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl">
        <p className="text-red-600">Błąd: {error}</p>
        <button
          onClick={() => router.push("/app/trips")}
          className="mt-4 underline text-sm"
        >
          ← Wróć do listy tripów
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-4">Porównanie tripów</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-3">Kategoria</th>
              {comparison.map((c) => (
                <th key={c.trip_id} className="text-left py-2 pr-3">
                  {c.name}
                  <br />
                  <small className="text-gray-600 font-normal">
                    {c.destination_name}
                  </small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <CompareRow
              label="Daty"
              values={comparison.map(
                (c) => `${c.date_from} → ${c.date_to} (${c.nights}n)`,
              )}
            />
            <CompareRow
              label="Lot min PLN"
              values={comparison.map(
                (c) => c.metrics.flight_min_pln?.toString() ?? "-",
              )}
              highlightMin
            />
            <CompareRow
              label="Hotel total PLN"
              values={comparison.map(
                (c) => c.metrics.hotel_total_pln?.toString() ?? "-",
              )}
              highlightMin
            />
            <CompareRow
              label="Hotel/noc PLN"
              values={comparison.map(
                (c) => c.metrics.hotel_per_night_pln?.toString() ?? "-",
              )}
              highlightMin
            />
            <CompareRow
              label="Real total PLN"
              values={comparison.map(
                (c) => c.metrics.real_total_cost_pln?.toString() ?? "-",
              )}
              highlightMin
              bold
            />
            <CompareRow
              label="Lot bezpośredni"
              values={comparison.map((c) =>
                c.metrics.direct_flight_available ? "TAK" : "NIE",
              )}
            />
            <CompareRow
              label="Średnia max temp"
              values={comparison.map((c) =>
                c.metrics.weather_temp_max_avg
                  ? `${c.metrics.weather_temp_max_avg}°C`
                  : "-",
              )}
            />
            <CompareRow
              label="Dni deszczowych"
              values={comparison.map((c) =>
                c.metrics.weather_rainy_days?.toString() ?? "-",
              )}
            />
            <CompareRow
              label="Atrakcji"
              values={comparison.map((c) =>
                c.metrics.attractions_count.toString(),
              )}
            />
            <CompareRow
              label="Krytyczne porady"
              values={comparison.map((c) =>
                c.metrics.advisories_count.critical.toString(),
              )}
            />
            <CompareRow
              label="Ostrzeżenia"
              values={comparison.map((c) =>
                c.metrics.advisories_count.warning.toString(),
              )}
            />
            <CompareRow
              label="Top advisory"
              values={comparison.map(
                (c) => c.metrics.top_advisory_title ?? "-",
              )}
            />
          </tbody>
        </table>
      </div>

      <button
        onClick={generateAiVerdict}
        disabled={generatingVerdict}
        className="mt-6 border px-4 py-2 rounded bg-black text-white disabled:opacity-50"
      >
        {generatingVerdict
          ? "Generuję rekomendację..."
          : "Wygeneruj AI rekomendację"}
      </button>

      {aiVerdict && (
        <div className="border p-4 rounded mt-4 bg-gray-50">
          <h3 className="font-semibold mb-2">Rekomendacja AI</h3>
          <p className="text-sm">{aiVerdict}</p>
          {tradeOffs.length > 0 && (
            <ul className="mt-2 text-sm list-disc pl-5">
              {tradeOffs.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-6">
        <button
          onClick={() => router.push("/app/trips")}
          className="underline text-sm"
        >
          ← Wróć do listy tripów
        </button>
      </p>
    </div>
  );
}

function CompareRow({
  label,
  values,
  highlightMin,
  bold,
}: {
  label: string;
  values: string[];
  highlightMin?: boolean;
  bold?: boolean;
}) {
  let minIdx = -1;
  if (highlightMin) {
    const numeric = values.map((v) => parseInt(v, 10));
    const valid = numeric.filter((n) => !isNaN(n));
    if (valid.length > 0) {
      const minVal = Math.min(...valid);
      minIdx = numeric.indexOf(minVal);
    }
  }

  return (
    <tr className="border-b">
      <td className={`py-2 pr-3 ${bold ? "font-bold" : ""}`}>{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`py-2 pr-3 ${i === minIdx ? "bg-green-50 font-bold" : ""} ${bold ? "font-semibold" : ""}`}
        >
          {v}
        </td>
      ))}
    </tr>
  );
}

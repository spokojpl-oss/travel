"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { TripComparison } from "@/lib/compare/trip-comparison";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Breadcrumb, PageContainer } from "@/components/layout/Header";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
      <PageContainer>
        <h1 className="font-display mb-4 text-3xl font-bold text-text-primary">
          Porównanie tripów
        </h1>
        <SkeletonList count={6} />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <p className="text-danger">Błąd: {error}</p>
        <Button
          variant="tertiary"
          className="mt-4"
          onClick={() => router.push("/app/trips")}
        >
          ← Wróć do listy tripów
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: "Start", href: "/app" },
          { label: "Moje wyjazdy", href: "/app/trips" },
          { label: "Porównanie" },
        ]}
      />

      <h1 className="font-display mb-6 text-3xl font-bold text-text-primary">
        Porównanie tripów
      </h1>

      <Card className="mb-6 overflow-hidden">
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-default bg-bg-soft">
                <th className="px-4 py-3 text-left font-semibold text-text-primary">
                  Kategoria
                </th>
                {comparison.map((c) => (
                  <th
                    key={c.trip_id}
                    className="px-4 py-3 text-left font-semibold text-text-primary"
                  >
                    {c.name}
                    <br />
                    <small className="font-normal text-text-secondary">
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
        </CardBody>
      </Card>

      <Button
        onClick={generateAiVerdict}
        disabled={generatingVerdict}
        className="mb-6"
      >
        {generatingVerdict
          ? "Generuję rekomendację..."
          : "Wygeneruj AI rekomendację"}
      </Button>

      {aiVerdict && (
        <Card className="mb-6">
          <CardHeader title="Rekomendacja AI" />
          <CardBody>
            <p className="text-sm text-text-secondary">{aiVerdict}</p>
            {tradeOffs.length > 0 && (
              <ul className="mt-3 list-disc pl-5 text-sm text-text-secondary">
                {tradeOffs.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      <Button variant="tertiary" onClick={() => router.push("/app/trips")}>
        ← Wróć do listy tripów
      </Button>
    </PageContainer>
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
    <tr className="border-b border-border-default">
      <td
        className={`px-4 py-3 ${bold ? "font-bold text-text-primary" : "text-text-secondary"}`}
      >
        {label}
      </td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`numeric px-4 py-3 ${
            i === minIdx ? "bg-success/10 font-bold text-success" : ""
          } ${bold ? "font-semibold text-text-primary" : ""}`}
        >
          {v}
        </td>
      ))}
    </tr>
  );
}

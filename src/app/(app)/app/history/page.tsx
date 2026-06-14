"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchHistoryEntry } from "@/types/domain";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Breadcrumb, PageContainer } from "@/components/layout/Header";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadHistory();
  }, [filter]);

  async function loadHistory() {
    setLoading(true);
    const url =
      filter === "all"
        ? "/api/history?limit=50"
        : `/api/history?type=${filter}&limit=50`;
    const res = await fetch(url);
    const data = await res.json();
    setHistory(data.history ?? []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/history?id=${id}`, { method: "DELETE" });
    setHistory((prev) => prev.filter((h) => h.id !== id));
  }

  async function handleClearAll() {
    if (!confirm("Usunąć całą historię wyszukiwań?")) return;
    await fetch("/api/history", { method: "DELETE" });
    setHistory([]);
  }

  function restoreSearch(entry: SearchHistoryEntry) {
    switch (entry.search_type) {
      case "activities":
        sessionStorage.setItem(
          "restore_search_activities",
          JSON.stringify(entry.params),
        );
        router.push("/app/search");
        break;
      case "destination_build": {
        const params = entry.params as {
          cluster?: unknown;
          selected_activities?: unknown;
        };
        router.push(
          `/app/destination?cluster=${encodeURIComponent(JSON.stringify(params.cluster))}&activities=${encodeURIComponent(JSON.stringify(params.selected_activities))}`,
        );
        break;
      }
      case "flights":
      case "hotels":
      case "transport": {
        const params = entry.params as { destination_id?: string };
        if (params.destination_id) {
          sessionStorage.setItem(
            `restore_search_${entry.search_type}`,
            JSON.stringify(entry.params),
          );
          router.push(`/app/destination?id=${params.destination_id}`);
        } else {
          alert("Restore dla tego typu wymaga destination_id w parametrach");
        }
        break;
      }
      default:
        alert("Restore dla tego typu nie jest jeszcze zaimplementowany");
    }
  }

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: "Start", href: "/app" },
          { label: "Historia wyszukiwań" },
        ]}
      />

      <h1 className="font-display mb-6 text-3xl font-bold text-text-primary">
        Historia wyszukiwań
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <label className="text-text-secondary">
          Filtruj:{" "}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="ml-1 rounded-md border border-border-default px-2 py-1.5"
          >
            <option value="all">Wszystkie</option>
            <option value="activities">Aktywności</option>
            <option value="destination_build">Destynacje</option>
            <option value="flights">Loty</option>
            <option value="hotels">Hotele</option>
            <option value="transport">Transport</option>
          </select>
        </label>
        <Button variant="danger" size="sm" onClick={handleClearAll}>
          Wyczyść całą historię
        </Button>
      </div>

      {loading && <SkeletonList count={4} />}

      {!loading && history.length === 0 && (
        <Card>
          <CardBody>
            <p className="text-sm text-text-secondary">
              Brak historii. Twoje wyszukiwania zaczną się pojawiać tutaj.
            </p>
          </CardBody>
        </Card>
      )}

      <ul className="space-y-3">
        {history.map((entry) => (
          <li key={entry.id}>
            <Card className="card-hover">
              <CardBody>
                <div>
                  <strong className="text-text-primary">
                    {translateType(entry.search_type)}
                  </strong>
                  <small className="ml-2 text-text-tertiary">
                    – {new Date(entry.executed_at).toLocaleString("pl-PL")}
                  </small>
                </div>
                <p className="mt-1 text-sm text-text-secondary">
                  {summarizeEntry(entry)}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => restoreSearch(entry)}
                  >
                    ↺ Przywróć
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(entry.id)}
                  >
                    ✕ Usuń
                  </Button>
                </div>
              </CardBody>
            </Card>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}

function translateType(t: string): string {
  switch (t) {
    case "activities":
      return "🎯 Aktywności";
    case "destination_build":
      return "📍 Destynacja";
    case "flights":
      return "✈️ Loty";
    case "hotels":
      return "🏨 Hotele";
    case "transport":
      return "🚗 Transport";
    default:
      return t;
  }
}

function summarizeEntry(entry: SearchHistoryEntry): string {
  const p = entry.params as Record<string, unknown>;
  const s = entry.result_summary as Record<string, unknown>;

  switch (entry.search_type) {
    case "activities": {
      const acts = (p.activities as string[]) ?? [];
      const count = (s.clusters_count as number) ?? 0;
      return `Aktywności: ${acts.slice(0, 3).join(", ")}${acts.length > 3 ? "..." : ""} → ${count} regionów`;
    }
    case "destination_build": {
      const acts = (p.selected_activities as string[]) ?? [];
      return `Destynacja: aktywności ${acts.slice(0, 3).join(", ")}`;
    }
    case "flights":
      return `Loty: ${p.departure_date_from} → ${p.departure_date_to}, ${(p.origins as string[])?.length ?? 0} lotnisk`;
    case "hotels":
      return `Hotele: ${p.check_in} → ${p.check_out}, ${p.adults} dorosłych`;
    case "transport":
      return `Transport: z ${p.airport_iata} do ${p.to_location_name}`;
    default:
      return JSON.stringify(p).substring(0, 100);
  }
}

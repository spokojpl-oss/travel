"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createTrip } from "@/app/(app)/app/trips/actions";
import type { Attraction } from "@/types/domain";

export function SaveTripSection({
  destinationId,
  destinationName,
  attractions,
}: {
  destinationId: string;
  destinationName: string;
  attractions: Pick<Attraction, "id" | "name">[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() + 30);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const from = start.toISOString().split("T")[0];
    const to = end.toISOString().split("T")[0];
    setDateFrom(from);
    setDateTo(to);
    setName(`${destinationName} ${from.substring(0, 7)}`);
    setSelectedIds(new Set(attractions.slice(0, 10).map((a) => a.id)));
  }, [destinationId, destinationName, attractions]);

  function toggleAttraction(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  async function handleSave() {
    if (selectedIds.size === 0) {
      setError("Wybierz co najmniej 1 atrakcję");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await createTrip({
      name: name || `${destinationName} wyjazd`,
      destination_id: destinationId,
      date_from: dateFrom,
      date_to: dateTo,
      selected_attraction_ids: Array.from(selectedIds),
    });
    setSaving(false);
    if ("success" in result && result.success && result.trip_id) {
      router.push(`/app/trips/${result.trip_id}`);
    } else if ("error" in result) {
      setError(
        typeof result.error === "string" ? result.error : "Nie udało się zapisać",
      );
    }
  }

  if (attractions.length === 0) return null;

  return (
    <section className="mb-8 border p-4 rounded border-green-200 bg-green-50">
      <h2 className="text-lg font-semibold mb-2">Zapisz jako wyjazd</h2>
      <p className="text-sm text-gray-600 mb-4">
        Zapisz ten pakiet i wygeneruj plan dzień-po-dniu, listę pakowania i
        checklistę przed wyjazdem.
      </p>

      <div className="flex flex-wrap gap-3 mb-4 text-sm">
        <label>
          Nazwa:{" "}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border px-2 py-1 rounded w-48"
          />
        </label>
        <label>
          Od:{" "}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </label>
        <label>
          Do:{" "}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </label>
      </div>

      <div className="mb-4 max-h-32 overflow-y-auto text-sm">
        {attractions.slice(0, 15).map((a) => (
          <label key={a.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.has(a.id)}
              onChange={() => toggleAttraction(a.id)}
            />
            {a.name}
          </label>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !dateFrom || !dateTo}
        className="border px-3 py-1 rounded bg-green-800 text-white disabled:opacity-50"
      >
        {saving ? "Zapisuję..." : "Zapisz jako wyjazd →"}
      </button>

      {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
    </section>
  );
}

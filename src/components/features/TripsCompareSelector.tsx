"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TripItem = {
  id: string;
  name: string;
  destinationName: string;
  dateFrom: string;
  dateTo: string;
};

export function TripsCompareSelector({ trips }: { trips: TripItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else if (next.size < 3) {
      next.add(id);
    }
    setSelected(next);
  }

  function handleCompare() {
    if (selected.size < 2) return;
    router.push(`/app/compare?ids=${Array.from(selected).join(",")}`);
  }

  if (trips.length < 2) return null;

  return (
    <div className="mb-6 border p-4 rounded bg-gray-50 text-sm">
      <p className="font-medium mb-2">
        Porównaj tripy (wybierz 2–3, potem kliknij Porównaj):
      </p>
      <ul className="space-y-2 mb-3">
        {trips.map((trip) => (
          <li key={trip.id}>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.has(trip.id)}
                onChange={() => toggle(trip.id)}
                disabled={!selected.has(trip.id) && selected.size >= 3}
              />
              <span>
                {trip.name} ({trip.destinationName}, {trip.dateFrom} →{" "}
                {trip.dateTo})
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button
        onClick={handleCompare}
        disabled={selected.size < 2}
        className="border px-3 py-1 rounded bg-black text-white disabled:opacity-50"
      >
        Porównaj wybrane ({selected.size})
      </button>
    </div>
  );
}

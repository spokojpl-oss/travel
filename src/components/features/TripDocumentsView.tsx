"use client";

import type { GeneratedItinerary } from "@/lib/trips/generate-itinerary";
import type { GeneratedPackingList } from "@/lib/trips/generate-packing-list";
import type { GeneratedPreTripTodo } from "@/lib/trips/generate-pre-trip-todo";
import { Icon } from "@/components/ui/Icon";

type TripDocument = {
  document_type: "itinerary" | "packing_list" | "pre_trip_todo";
  content: unknown;
};

export function TripDocumentsView({
  documents,
  showCheckboxes = true,
}: {
  documents: TripDocument[];
  showCheckboxes?: boolean;
}) {
  const itinerary = documents.find((d) => d.document_type === "itinerary")
    ?.content as GeneratedItinerary | undefined;
  const packing = documents.find((d) => d.document_type === "packing_list")
    ?.content as GeneratedPackingList | undefined;
  const todo = documents.find((d) => d.document_type === "pre_trip_todo")
    ?.content as GeneratedPreTripTodo | undefined;

  if (!itinerary && !packing && !todo) {
    return (
      <p className="text-sm text-gray-600">
        Plan nie został jeszcze wygenerowany.
      </p>
    );
  }

  return (
    <div className="space-y-8 text-sm">
      {itinerary && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Plan dzień po dniu</h2>
          <p className="mb-4">{itinerary.introduction}</p>
          {itinerary.unassigned_attractions?.length > 0 && (
            <p className="mb-4 flex items-start gap-2 text-amber-700">
              <Icon name="alert-triangle" size={16} className="mt-0.5 shrink-0" />
              {itinerary.unassigned_attractions.length} atrakcji nie zmieściło
              się w planie – rozważ wydłużenie pobytu.
            </p>
          )}
          <div className="space-y-3">
            {itinerary.days?.map((day) => (
              <div key={day.day_number} className="border p-3 rounded">
                <h3 className="font-medium">
                  Dzień {day.day_number} ({day.date}) – {day.type}
                </h3>
                {day.daily_summary && <p className="mt-1">{day.daily_summary}</p>}
                {day.attractions.length > 0 && (
                  <ul className="list-disc pl-5 mt-2">
                    {day.attractions.map((a, i) => (
                      <li key={i}>
                        <strong>{a.name}</strong> ({a.time_of_day_hint},{" "}
                        {a.duration_minutes ?? "?"} min)
                      </li>
                    ))}
                  </ul>
                )}
                {day.tips?.length > 0 && (
                  <div className="mt-2">
                    <strong>Tipy:</strong>
                    <ul className="list-disc pl-5">
                      {day.tips.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {day.warnings?.map((w, i) => (
                  <p key={i} className="mt-1 flex items-start gap-2 text-amber-700">
                    <Icon name="alert-triangle" size={14} className="mt-0.5 shrink-0" />
                    {w}
                  </p>
                ))}
                {day.notes?.map((n, i) => (
                  <p key={i} className="text-gray-600 text-xs mt-1">
                    {n}
                  </p>
                ))}
              </div>
            ))}
          </div>
          {itinerary.general_notes?.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-1">Ogólne uwagi</h3>
              <ul className="list-disc pl-5">
                {itinerary.general_notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {packing && (
        <section className="page-break">
          <h2 className="text-lg font-semibold mb-3">Lista do spakowania</h2>
          <p className="mb-4">{packing.weather_summary}</p>
          {packing.categories?.map((cat, i) => (
            <div key={i} className="mb-4">
              <h3 className="font-medium mb-1">{cat.category}</h3>
              <ul className="space-y-1">
                {cat.items.map((item, j) => (
                  <li key={j}>
                    {showCheckboxes && <input type="checkbox" className="mr-2" />}
                    <strong>{item.name}</strong>
                    {item.quantity && <span> – {item.quantity}</span>}
                    {item.reason && (
                      <span className="text-gray-600"> ({item.reason})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {packing.special_notes?.length > 0 && (
            <div>
              <h3 className="font-medium mb-1">Uwagi</h3>
              <ul className="list-disc pl-5">
                {packing.special_notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {todo && (
        <section className="page-break">
          <h2 className="text-lg font-semibold mb-3">Do zrobienia przed wyjazdem</h2>
          {todo.destination_specific_warnings?.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium mb-1">
                Ostrzeżenia specyficzne dla destynacji
              </h3>
              <ul className="list-disc pl-5">
                {todo.destination_specific_warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {Object.entries(todo.timeline ?? {}).map(([timeframe, items]) => (
            <div key={timeframe} className="mb-4">
              <h3 className="font-medium mb-1">{translateTimeframe(timeframe)}</h3>
              <ul className="space-y-1">
                {(items as Array<{ task: string; is_critical: boolean; reason?: string }>).map(
                  (item, i) => (
                    <li key={i}>
                      {item.is_critical && "❗ "}
                      {showCheckboxes && <input type="checkbox" className="mr-2" />}
                      <strong>{item.task}</strong>
                      {item.reason && (
                        <span className="text-gray-600"> – {item.reason}</span>
                      )}
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function translateTimeframe(t: string): string {
  switch (t) {
    case "3_months":
      return "3 miesiące przed";
    case "1_month":
      return "1 miesiąc przed";
    case "2_weeks":
      return "2 tygodnie przed";
    case "1_week":
      return "1 tydzień przed";
    case "departure_day":
      return "Dzień wyjazdu";
    default:
      return t;
  }
}

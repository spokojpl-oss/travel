"use client";

import { TripDocumentsView } from "@/components/features/TripDocumentsView";

type PrintTrip = {
  name: string;
  date_from: string;
  date_to: string;
  destination: { name: string; country_code: string };
  documents: Array<{
    document_type: "itinerary" | "packing_list" | "pre_trip_todo";
    content: unknown;
  }>;
};

export function TripPrintView({ trip }: { trip: PrintTrip }) {
  return (
    <div className="print-container max-w-3xl mx-auto p-8">
      <style>{`
        @media print {
          body { font-family: Georgia, serif; font-size: 11pt; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          h1, h2, h3 { page-break-after: avoid; }
          @page { margin: 2cm; }
        }
      `}</style>

      <div className="no-print mb-6">
        <button
          onClick={() => window.print()}
          className="border px-4 py-2 rounded bg-black text-white"
        >
          Drukuj / Zapisz jako PDF
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-2">{trip.name}</h1>
      <p className="mb-8 text-gray-700">
        <strong>{trip.destination.name}</strong> ({trip.destination.country_code})
        <br />
        {trip.date_from} → {trip.date_to}
      </p>

      <TripDocumentsView documents={trip.documents} showCheckboxes={false} />
    </div>
  );
}

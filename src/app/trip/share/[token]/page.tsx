import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { TripDocumentsView } from "@/components/features/TripDocumentsView";

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: trip } = await admin
    .from("trips")
    .select(
      `
      id, name, date_from, date_to, status,
      destination:destinations (id, name, country_code, destination_type),
      documents:trip_documents (document_type, content, created_at)
    `,
    )
    .eq("share_token", token)
    .eq("is_share_enabled", true)
    .single();

  if (!trip) notFound();

  const destination = trip.destination as {
    name: string;
    country_code: string;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto p-8">
        <p className="text-sm text-gray-500 mb-4">
          👁️ Tryb tylko do odczytu (link udostępniony)
        </p>
        <h1 className="text-2xl font-bold mb-2">{trip.name}</h1>
        <p className="text-sm text-gray-600 mb-8">
          {destination.name} ({destination.country_code}) · {trip.date_from} →{" "}
          {trip.date_to}
        </p>

        <TripDocumentsView
          documents={
            (trip.documents ?? []) as Array<{
              document_type: "itinerary" | "packing_list" | "pre_trip_todo";
              content: unknown;
            }>
          }
          showCheckboxes={false}
        />
      </main>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TripsCompareSelector } from "@/components/features/TripsCompareSelector";

export default async function TripsListPage() {
  const supabase = await createClient();
  const { data: trips } = await supabase
    .from("trips")
    .select("id, name, date_from, date_to, status, destination:destinations (name)")
    .order("created_at", { ascending: false });

  const compareTrips =
    trips?.map((trip) => ({
      id: trip.id,
      name: trip.name,
      destinationName:
        (trip.destination as { name: string } | null)?.name ?? "—",
      dateFrom: trip.date_from,
      dateTo: trip.date_to,
    })) ?? [];

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Moje wyjazdy</h1>
      {(!trips || trips.length === 0) && (
        <p className="text-sm text-gray-600 mb-4">
          Brak wyjazdów. Z strony destynacji możesz zapisać znaleziony pakiet jako
          wyjazd.
        </p>
      )}

      <TripsCompareSelector trips={compareTrips} />
      <ul className="space-y-2">
        {trips?.map((trip) => (
          <li key={trip.id} className="border p-3 rounded">
            <Link href={`/app/trips/${trip.id}`} className="font-medium underline">
              {trip.name}
            </Link>
            <span className="text-sm text-gray-600 ml-2">
              {(trip.destination as { name: string } | null)?.name ?? "—"},{" "}
              {trip.date_from} → {trip.date_to}, {trip.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

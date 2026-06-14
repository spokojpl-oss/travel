import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TripsCompareSelector } from "@/components/features/TripsCompareSelector";
import { PageContainer, Breadcrumb } from "@/components/layout/Header";
import { Card, CardBody } from "@/components/ui/Card";

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
    <PageContainer>
      <Breadcrumb
        items={[
          { label: "Start", href: "/app" },
          { label: "Moje wyjazdy" },
        ]}
      />

      <h1 className="font-display mb-6 text-3xl font-bold text-text-primary">
        Moje wyjazdy
      </h1>

      {(!trips || trips.length === 0) && (
        <p className="mb-6 text-sm text-text-secondary">
          Brak wyjazdów. Z strony destynacji możesz zapisać znaleziony pakiet jako
          wyjazd.
        </p>
      )}

      <TripsCompareSelector trips={compareTrips} />

      <ul className="space-y-3">
        {trips?.map((trip) => (
          <li key={trip.id}>
            <Card className="card-hover transition-shadow hover:shadow-cardHover">
              <CardBody>
                <Link
                  href={`/app/trips/${trip.id}`}
                  className="font-display text-lg font-bold text-brand-700 hover:underline"
                >
                  {trip.name}
                </Link>
                <p className="mt-1 text-sm text-text-secondary">
                  {(trip.destination as { name: string } | null)?.name ?? "—"},{" "}
                  {trip.date_from} → {trip.date_to} · {trip.status}
                </p>
              </CardBody>
            </Card>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}

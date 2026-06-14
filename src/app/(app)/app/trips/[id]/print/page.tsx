import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { TripPrintView } from "@/components/features/TripPrintView";

export default async function TripPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: trip } = await supabase
    .from("trips")
    .select(
      `
      *,
      destination:destinations (*),
      documents:trip_documents (document_type, content)
    `,
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!trip) notFound();

  return <TripPrintView trip={trip} />;
}

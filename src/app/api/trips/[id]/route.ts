import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const { data: trip } = await supabase
    .from("trips")
    .select(
      `
      *,
      destination:destinations (*),
      hotel:hotels (id, name, lat, lon, stars, address),
      documents:trip_documents (document_type, content, created_at, validation_issues)
    `,
    )
    .eq("id", id)
    .single();

  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ trip });
}

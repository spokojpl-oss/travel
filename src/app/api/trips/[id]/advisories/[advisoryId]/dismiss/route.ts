import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; advisoryId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: tripId, advisoryId } = await params;

  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    // brak body jest OK
  }

  const { error } = await supabase
    .from("trip_advisories")
    .update({
      dismissed_at: new Date().toISOString(),
      dismissed_reason: body.reason ?? null,
    })
    .eq("id", advisoryId)
    .eq("trip_id", tripId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

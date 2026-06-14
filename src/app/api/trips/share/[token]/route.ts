import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
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

  if (!trip) {
    return NextResponse.json(
      { error: "Trip not found or share disabled" },
      { status: 404 },
    );
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  const userAgentHash = crypto
    .createHash("sha256")
    .update(userAgent)
    .digest("hex")
    .substring(0, 16);
  const referrer = request.headers.get("referer") ?? null;

  void admin
    .from("trip_share_views")
    .insert({
      trip_id: trip.id,
      user_agent_hash: userAgentHash,
      referrer,
    })
    .then(() => {});

  return NextResponse.json({ trip });
}

import { NextResponse } from "next/server";
import { seedAirportsFromOurAirports } from "@/lib/flights/seed-airports";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminEmails = getAdminEmails();
  if (
    !user ||
    adminEmails.length === 0 ||
    !adminEmails.includes((user.email ?? "").toLowerCase())
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const result = await seedAirportsFromOurAirports();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Seed failed",
      },
      { status: 500 },
    );
  }
}

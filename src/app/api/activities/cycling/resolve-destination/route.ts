import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveCyclingDestinationId } from "@/lib/activities/cycling/resolve-destination-id";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  destinationLabel: z.string().min(2),
  lat: z.number().optional(),
  lon: z.number().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const resolved = await resolveCyclingDestinationId(parsed.data);
  if (!resolved) {
    return NextResponse.json(
      {
        error:
          "Nie znaleziono destynacji w bazie — ustaw dokładniejszą lokalizację w wyszukiwarce.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(resolved);
}

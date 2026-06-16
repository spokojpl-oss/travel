import { NextResponse } from "next/server";
import { apiEnv } from "@/config/api-env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();
  if (!name || !name.startsWith("places/") || !name.includes("/photos/")) {
    return NextResponse.json({ error: "Invalid photo name" }, { status: 400 });
  }

  const key = apiEnv.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/${name}/media?maxHeightPx=480&maxWidthPx=800&skipHttpRedirect=true`,
      {
        headers: { "X-Goog-Api-Key": key },
        next: { revalidate: 86400 },
      },
    );
    if (!response.ok) {
      return NextResponse.json({ error: "Photo unavailable" }, { status: 502 });
    }
    const body = (await response.json()) as { photoUri?: string };
    if (!body.photoUri) {
      return NextResponse.json({ error: "Photo unavailable" }, { status: 502 });
    }
    return NextResponse.redirect(body.photoUri, 302);
  } catch {
    return NextResponse.json({ error: "Photo fetch failed" }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/places/search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const type =
    searchParams.get("type") === "airport" ? "airport" : "destination";
  const limit = Math.min(Number(searchParams.get("limit") ?? 12), 20);

  try {
    const places = await searchPlaces({ query: q, type, limit });
    return NextResponse.json({ places });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Search failed",
        places: [],
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/places/search";
import { agentLog } from "@/lib/debug/agent-log";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const start = Date.now();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const type =
    searchParams.get("type") === "airport" ? "airport" : "destination";
  const limit = Math.min(Number(searchParams.get("limit") ?? 12), 20);

  try {
    const places = await searchPlaces({ query: q, type, limit });
    agentLog(
      "places/search/route.ts:GET",
      "places search done",
      { q_len: q.length, type, count: places.length, ms: Date.now() - start },
      "D",
    );
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

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type SearchType = Database["public"]["Enums"]["search_type"];
const VALID_SEARCH_TYPES: SearchType[] = [
  "activities",
  "destination_build",
  "flights",
  "hotels",
  "transport",
];

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);

  let query = supabase
    .from("search_history")
    .select("*")
    .order("executed_at", { ascending: false })
    .limit(limit);

  if (type && VALID_SEARCH_TYPES.includes(type as SearchType)) {
    query = query.eq("search_type", type as SearchType);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ history: data ?? [] });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    await supabase.from("search_history").delete().eq("id", id);
  } else {
    await supabase.from("search_history").delete().eq("user_id", user.id);
  }

  return NextResponse.json({ success: true });
}

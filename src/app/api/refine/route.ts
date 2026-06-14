import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseRefinement } from "@/lib/refine/parse-refinement";

export const dynamic = "force-dynamic";

const schema = z.object({
  search_type: z.enum([
    "activities",
    "flights",
    "hotels",
    "transport",
  ]),
  current_params: z.record(z.string(), z.unknown()),
  user_text: z.string().min(1).max(500),
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

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation" }, { status: 400 });
  }

  try {
    const result = await parseRefinement({
      context: {
        searchType: parsed.data.search_type,
        currentParams: parsed.data.current_params,
      },
      userText: parsed.data.user_text,
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}

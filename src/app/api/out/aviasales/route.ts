import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAviasalesSearchUrl } from "@/lib/api/travelpayouts";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  origin: z.string().length(3),
  destination: z.string().length(3),
  dep: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ret: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  adults: z.coerce.number().int().min(1).max(9).default(1),
  children: z.coerce.number().int().min(0).max(9).default(0),
  infants: z.coerce.number().int().min(0).max(9).default(0),
});

/** Krótki redirect do Aviasales — unika 414 gdy Drive owija długie URL-e. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    origin: url.searchParams.get("origin")?.toUpperCase(),
    destination: url.searchParams.get("destination")?.toUpperCase(),
    dep: url.searchParams.get("dep"),
    ret: url.searchParams.get("ret") ?? undefined,
    adults: url.searchParams.get("adults") ?? undefined,
    children: url.searchParams.get("children") ?? undefined,
    infants: url.searchParams.get("infants") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid flight link params" }, { status: 400 });
  }

  const target = buildAviasalesSearchUrl({
    origin: parsed.data.origin,
    destination: parsed.data.destination,
    departureDate: parsed.data.dep,
    returnDate: parsed.data.ret ?? null,
    adults: parsed.data.adults,
    children: parsed.data.children,
    infants: parsed.data.infants,
  });

  return NextResponse.redirect(target, 302);
}

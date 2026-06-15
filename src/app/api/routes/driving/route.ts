import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchDrivingRoutes } from "@/lib/routing/osrm";

const geoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

const bodySchema = z.object({
  segments: z
    .array(
      z.object({
        id: z.string().min(1),
        from: geoPointSchema,
        to: geoPointSchema,
      }),
    )
    .min(1)
    .max(12),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const routes = await fetchDrivingRoutes(parsed.data.segments);

  return NextResponse.json({
    routes: routes.map((item) => ({
      id: item.id,
      ...item.route,
    })),
  });
}

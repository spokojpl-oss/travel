import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveDrivingRoutes } from "@/lib/routing/driving-routes";
import { getGoogleMapsServerKey } from "@/lib/maps/google-maps-config";

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

  const routes = await resolveDrivingRoutes(parsed.data.segments);

  return NextResponse.json({
    routes: routes.map((item) => ({
      id: item.id,
      ...item.route,
    })),
    meta: {
      provider: getGoogleMapsServerKey() ? "google" : "osrm",
    },
  });
}

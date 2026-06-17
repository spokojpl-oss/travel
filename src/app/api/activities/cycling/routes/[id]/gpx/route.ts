import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildRouteGpx,
  routeGpxFilename,
} from "@/lib/activities/cycling/gpx-export";
import { parseActivityRouteRow } from "@/lib/supabase/activity-routes";
import type { ActivityRoute } from "@/types/activities";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing route id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: route, error } = await supabase
    .from("activity_routes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!route) {
    return NextResponse.json({ error: "Route not found" }, { status: 404 });
  }

  const parsedRoute = parseActivityRouteRow(route as unknown as ActivityRoute);
  const gpx = buildRouteGpx(parsedRoute);
  if (!gpx) {
    return NextResponse.json(
      { error: "Route geometry unavailable for GPX export" },
      { status: 422 },
    );
  }

  return new NextResponse(gpx, {
    status: 200,
    headers: {
      "Content-Type": "application/gpx+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${routeGpxFilename(parsedRoute)}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

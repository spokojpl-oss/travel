import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/auth";
import {
  listTouristRegionScrapeStatus,
  scrapeTouristRegionOsm,
} from "@/lib/api/tourist-region-osm-scrape";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") === "all" ? "all" : "empty";

  const regions = await listTouristRegionScrapeStatus();
  const filtered =
    mode === "all" ? regions : regions.filter((r) => r.needsScrape);

  return NextResponse.json({
    mode,
    total: regions.length,
    count: filtered.length,
    regions: filtered,
    emptyCount: regions.filter((r) => r.needsScrape).length,
  });
}

export async function POST(request: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const regionId = searchParams.get("regionId")?.trim();
  if (!regionId) {
    return NextResponse.json(
      { error: "Brak parametru regionId" },
      { status: 400 },
    );
  }

  try {
    const result = await scrapeTouristRegionOsm(regionId);
    return NextResponse.json({ success: true, result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

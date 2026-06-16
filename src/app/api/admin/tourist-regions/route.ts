import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  invalidateTouristRegionsCache,
  listAllTouristRegionsAdmin,
  seedTouristRegionsFromDefaults,
  upsertTouristRegionFromSeed,
} from "@/lib/destinations/tourist-regions-store";
import type { RegionCharacter, RegionVibe, TouristRegion } from "@/lib/destinations/tourist-regions";

export const dynamic = "force-dynamic";

const pickSchema = z.object({
  day_theme: z.enum([
    "beach_relax",
    "city_culture",
    "active_outdoor",
    "nature",
    "kids",
    "free",
  ]),
  name_pl: z.string().min(1),
  name_en: z.string().min(1),
  why_pl: z.string().min(1),
  why_en: z.string().min(1),
  activity_slugs: z.array(z.string()).default([]),
  rank: z.number().int().min(1).default(1),
});

const regionSchema = z.object({
  id: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/),
  slug: z.string().min(2).max(80),
  destination_keys: z.array(z.string().min(1)).min(1),
  name_pl: z.string().min(1),
  name_en: z.string().min(1),
  character: z.enum(["resort", "historic", "wild", "mixed"]),
  vibe: z.enum(["popular", "balanced", "offbeat"]),
  overview_pl: z.string().min(1),
  overview_en: z.string().min(1),
  stay_hint_pl: z.string().min(1),
  stay_hint_en: z.string().min(1),
  center_lat: z.number(),
  center_lon: z.number(),
  sort_order: z.number().int().optional(),
  picks: z.array(pickSchema).default([]),
});

export async function GET() {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const regions = await listAllTouristRegionsAdmin();
    return NextResponse.json({ regions, count: regions.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load regions" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "action" in body &&
    (body as { action?: string }).action === "seed"
  ) {
    try {
      const result = await seedTouristRegionsFromDefaults();
      return NextResponse.json({ success: true, ...result });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Seed failed" },
        { status: 500 },
      );
    }
  }

  const parsed = regionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const region: TouristRegion = {
    ...parsed.data,
    character: parsed.data.character as RegionCharacter,
    vibe: parsed.data.vibe as RegionVibe,
  };

  try {
    await upsertTouristRegionFromSeed(region, parsed.data.sort_order ?? 0);
    invalidateTouristRegionsCache();
    return NextResponse.json({ success: true, id: region.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("tourist_regions").delete().eq("id", id);
    if (error) throw new Error(error.message);
    invalidateTouristRegionsCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 },
    );
  }
}

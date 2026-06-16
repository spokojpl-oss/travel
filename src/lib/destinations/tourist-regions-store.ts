import { createAdminClient } from "@/lib/supabase/admin";
import { SEED_TOURIST_REGIONS } from "@/lib/destinations/tourist-regions-seed";
import {
  findTouristRegionsInCatalog,
  mapDbRowToTouristRegion,
  type DbTouristRegionRow,
  type ScoredTouristRegion,
  type TouristRegion,
} from "@/lib/destinations/tourist-regions";
import type { TripRhythm } from "@/lib/search/trip-rhythm";

const CACHE_TTL_MS = 60_000;

let catalogCache: { regions: TouristRegion[]; expiresAt: number } | null = null;
let autoSeedAttempted = false;

export function invalidateTouristRegionsCache(): void {
  catalogCache = null;
  autoSeedAttempted = false;
}

function mergeRegionCatalog(
  dbRegions: TouristRegion[],
  seedRegions: TouristRegion[],
): TouristRegion[] {
  const byId = new Map<string, TouristRegion>();
  for (const region of seedRegions) byId.set(region.id, region);
  for (const region of dbRegions) byId.set(region.id, region);
  return [...byId.values()];
}

export async function loadTouristRegionsCatalog(): Promise<TouristRegion[]> {
  if (catalogCache && Date.now() < catalogCache.expiresAt) {
    return catalogCache.regions;
  }

  let dbRegions: TouristRegion[] = [];
  let dbQueryOk = false;
  let dbEmpty = false;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("tourist_regions")
      .select("*, region_picks(*)")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name_pl", { ascending: true });

    if (!error) {
      dbQueryOk = true;
      if (data && data.length > 0) {
        dbRegions = (data as DbTouristRegionRow[]).map(mapDbRowToTouristRegion);
      } else {
        dbEmpty = true;
      }
    }
  } catch {
    /* fallback to seed */
  }

  if (dbEmpty && !autoSeedAttempted) {
    autoSeedAttempted = true;
    try {
      await seedTouristRegionsFromDefaults();
      const admin = createAdminClient();
      const { data } = await admin
        .from("tourist_regions")
        .select("*, region_picks(*)")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("name_pl", { ascending: true });
      if (data && data.length > 0) {
        dbRegions = (data as DbTouristRegionRow[]).map(mapDbRowToTouristRegion);
      }
    } catch {
      /* seed optional — seed file still works */
    }
  }

  const regions =
    dbQueryOk && dbRegions.length > 0
      ? mergeRegionCatalog(dbRegions, SEED_TOURIST_REGIONS)
      : dbQueryOk
        ? mergeRegionCatalog([], SEED_TOURIST_REGIONS)
        : SEED_TOURIST_REGIONS;

  catalogCache = { regions, expiresAt: Date.now() + CACHE_TTL_MS };
  return regions;
}

export async function findTouristRegionsAsync({
  destinationLabel,
  rhythm,
  limit = 8,
}: {
  destinationLabel: string;
  rhythm: TripRhythm;
  limit?: number;
}): Promise<ScoredTouristRegion[]> {
  const catalog = await loadTouristRegionsCatalog();
  return findTouristRegionsInCatalog(catalog, { destinationLabel, rhythm, limit });
}

export async function listAllTouristRegionsAdmin(): Promise<TouristRegion[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tourist_regions")
    .select("*, region_picks(*)")
    .order("sort_order", { ascending: true })
    .order("name_pl", { ascending: true });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return SEED_TOURIST_REGIONS;
  return (data as DbTouristRegionRow[]).map(mapDbRowToTouristRegion);
}

export async function upsertTouristRegionFromSeed(
  region: TouristRegion,
  sortOrder: number,
): Promise<void> {
  const admin = createAdminClient();
  const { error: regionError } = await admin.from("tourist_regions").upsert(
    {
      id: region.id,
      slug: region.slug,
      destination_keys: region.destination_keys,
      name_pl: region.name_pl,
      name_en: region.name_en,
      character: region.character,
      vibe: region.vibe,
      overview_pl: region.overview_pl,
      overview_en: region.overview_en,
      stay_hint_pl: region.stay_hint_pl,
      stay_hint_en: region.stay_hint_en,
      center_lat: region.center_lat,
      center_lon: region.center_lon,
      active: true,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (regionError) throw new Error(regionError.message);

  await admin.from("region_picks").delete().eq("region_id", region.id);

  if (region.picks.length > 0) {
    const { error: picksError } = await admin.from("region_picks").insert(
      region.picks.map((pick) => ({
        region_id: region.id,
        day_theme: pick.day_theme,
        name_pl: pick.name_pl,
        name_en: pick.name_en,
        why_pl: pick.why_pl,
        why_en: pick.why_en,
        activity_slugs: pick.activity_slugs,
        rank: pick.rank,
      })),
    );
    if (picksError) throw new Error(picksError.message);
  }
}

export async function seedTouristRegionsFromDefaults(): Promise<{
  upserted: number;
}> {
  let upserted = 0;
  for (let i = 0; i < SEED_TOURIST_REGIONS.length; i++) {
    await upsertTouristRegionFromSeed(SEED_TOURIST_REGIONS[i]!, i);
    upserted += 1;
  }
  invalidateTouristRegionsCache();
  return { upserted };
}

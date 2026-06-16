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

export function invalidateTouristRegionsCache(): void {
  catalogCache = null;
}

export async function loadTouristRegionsCatalog(): Promise<TouristRegion[]> {
  if (catalogCache && Date.now() < catalogCache.expiresAt) {
    return catalogCache.regions;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("tourist_regions")
      .select("*, region_picks(*)")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name_pl", { ascending: true });

    if (!error && data && data.length > 0) {
      const regions = (data as DbTouristRegionRow[]).map(mapDbRowToTouristRegion);
      catalogCache = { regions, expiresAt: Date.now() + CACHE_TTL_MS };
      return regions;
    }
  } catch {
    /* fallback to seed */
  }

  catalogCache = {
    regions: SEED_TOURIST_REGIONS,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  return SEED_TOURIST_REGIONS;
}

export async function findTouristRegionsAsync({
  destinationLabel,
  rhythm,
  limit = 6,
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

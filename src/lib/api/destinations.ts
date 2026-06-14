import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BoundingBox,
  Destination,
  DestinationType,
} from "@/types/domain";
import type { Json } from "@/types/database";

export async function findOrCreateDestination({
  slug,
  name,
  countryCode,
  type,
  centerLat,
  centerLon,
  boundingBox,
  timezone,
  description,
  parentDestinationId,
}: {
  slug: string;
  name: string;
  countryCode: string;
  type: DestinationType;
  centerLat: number;
  centerLon: number;
  boundingBox: BoundingBox;
  timezone: string;
  description?: string;
  parentDestinationId?: string;
}): Promise<Destination> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("destinations")
    .select("*")
    .eq("slug", slug)
    .single();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("destinations")
    .insert({
      slug,
      name,
      country_code: countryCode,
      destination_type: type,
      center_lat: centerLat,
      center_lon: centerLon,
      bounding_box: boundingBox as Json,
      timezone,
      description: description ?? null,
      parent_destination_id: parentDestinationId ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create destination: ${error?.message}`);
  }

  return data;
}

export async function getDestinationBySlug(
  slug: string,
): Promise<Destination | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("destinations")
    .select("*")
    .eq("slug", slug)
    .single();
  return data;
}

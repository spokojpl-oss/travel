import { findOrCreateDestination } from "@/lib/api/destinations";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BoundingBox } from "@/types/domain";

const COUNTRY_LABELS: Record<string, string> = {
  hiszpania: "ES",
  spain: "ES",
  portugalia: "PT",
  portugal: "PT",
  grecja: "GR",
  greece: "GR",
  chorwacja: "HR",
  croatia: "HR",
  włochy: "IT",
  italy: "IT",
  francja: "FR",
  france: "FR",
  cypr: "CY",
  cyprus: "CY",
  turcja: "TR",
  turkey: "TR",
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function countryFromLabel(label: string): string {
  const parts = label.split(",").map((p) => p.trim().toLowerCase());
  for (const part of parts.slice(1)) {
    if (COUNTRY_LABELS[part]) return COUNTRY_LABELS[part]!;
  }
  return "XX";
}

function bboxAround(lat: number, lon: number, delta = 0.35): BoundingBox {
  return {
    north: lat + delta,
    south: lat - delta,
    east: lon + delta,
    west: lon - delta,
  };
}

export async function resolveCyclingDestinationId({
  destinationLabel,
  lat,
  lon,
}: {
  destinationLabel: string;
  lat?: number | null;
  lon?: number | null;
}): Promise<{ id: string; center: { lat: number; lng: number } } | null> {
  const primary = destinationLabel.split(",")[0]?.trim() ?? destinationLabel.trim();
  if (!primary) return null;

  const supabase = createAdminClient();
  const { data: matches } = await supabase
    .from("destinations")
    .select("id, name, center_lat, center_lon")
    .ilike("name", `%${primary}%`)
    .limit(8);

  if (matches?.length) {
    let best = matches[0]!;
    if (lat != null && lon != null && matches.length > 1) {
      best = [...matches].sort((a, b) => {
        const da =
          Math.hypot(Number(a.center_lat) - lat, Number(a.center_lon) - lon) || 0;
        const db =
          Math.hypot(Number(b.center_lat) - lat, Number(b.center_lon) - lon) || 0;
        return da - db;
      })[0]!;
    }
    return {
      id: best.id,
      center: {
        lat: lat != null && Number.isFinite(lat) ? lat : Number(best.center_lat),
        lng: lon != null && Number.isFinite(lon) ? lon : Number(best.center_lon),
      },
    };
  }

  if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  const slug = slugify(primary);
  const destination = await findOrCreateDestination({
    slug,
    name: primary,
    countryCode: countryFromLabel(destinationLabel),
    type: "region",
    centerLat: lat,
    centerLon: lon,
    boundingBox: bboxAround(lat, lon),
    timezone: "Europe/Madrid",
  });

  return {
    id: destination.id,
    center: { lat: Number(destination.center_lat), lng: Number(destination.center_lon) },
  };
}

import crypto from "node:crypto";
import { findOrCreateDestination } from "@/lib/api/destinations";
import type { GooglePlace } from "@/lib/api/google-places";
import { searchPlacesByText } from "@/lib/api/google-places";
import { fetchWeatherForRange } from "@/lib/api/weather";
import {
  fetchWikivoyageDestination,
  type WikivoyageDestinationContent,
} from "@/lib/api/wikivoyage";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrichClusterWithSettlement } from "@/lib/search/settlement-resolver";
import {
  getOrCreateDestinationSummary,
  type DestinationSummary,
} from "@/lib/synthesis/destination-summary";
import type {
  AttractionWithActivities,
  Destination,
  GeoCluster,
} from "@/types/domain";

export type BuildEvent =
  | { type: "started"; destination_name: string }
  | { type: "destination_ready"; destination: Destination }
  | { type: "weather_loaded"; weather: object | null }
  | {
      type: "wikivoyage_loaded";
      wikivoyage: WikivoyageDestinationContent | null;
    }
  | { type: "attractions_loaded"; count: number; matching: number }
  | { type: "google_places_loaded"; count: number; places?: GooglePlace[] }
  | { type: "ai_synthesis_started" }
  | {
      type: "ai_synthesis_loaded";
      from_cache: boolean;
      summary: DestinationSummary;
      context_hash: string;
    }
  | { type: "complete"; duration_ms: number }
  | { type: "error"; step: string; message: string };

export type DestinationBuildInput = {
  cluster: GeoCluster;
  selectedActivities: string[];
  trip?: {
    dateFrom?: string;
    dateTo?: string;
    adults?: number;
    children_ages?: number[];
    travel_style?: string;
  };
  userId?: string;
};

export async function* buildDestinationPage(
  input: DestinationBuildInput,
): AsyncGenerator<BuildEvent, void, undefined> {
  const startTime = Date.now();
  const supabase = createAdminClient();
  const buildId = crypto.randomUUID();

  const cluster = await enrichClusterWithSettlement(input.cluster, {
    fastMode: true,
  });
  const destinationName = generateDestinationName(cluster);
  const slug = generateSlug(cluster);

  yield { type: "started", destination_name: destinationName };

  let destination: Destination;
  try {
    destination = await findOrCreateDestination({
      slug,
      name: destinationName,
      countryCode: detectCountryFromCluster(cluster) ?? "XX",
      type: cluster.settlement ? "city" : "area",
      centerLat: cluster.center.lat,
      centerLon: cluster.center.lon,
      boundingBox: cluster.bbox,
      timezone: "UTC",
    });
  } catch (error) {
    yield { type: "error", step: "destination_create", message: errorMsg(error) };
    return;
  }

  await supabase.from("destination_builds").insert({
    id: buildId,
    destination_id: destination.id,
    build_request_id: buildId,
    triggered_by_user: input.userId ?? null,
    status: "in_progress",
  });

  yield { type: "destination_ready", destination };

  let weatherSummary: object | null = null;
  if (input.trip?.dateFrom && input.trip.dateTo) {
    try {
      weatherSummary = await fetchWeatherForRange({
        location: cluster.center,
        destinationId: destination.id,
        dateFrom: input.trip.dateFrom,
        dateTo: input.trip.dateTo,
      });
      await markStepComplete(buildId, "weather");
    } catch (error) {
      yield { type: "error", step: "weather", message: errorMsg(error) };
    }
  }
  yield { type: "weather_loaded", weather: weatherSummary };

  let wikivoyage: WikivoyageDestinationContent | null = null;
  try {
    wikivoyage = await fetchWikivoyageDestination({
      pageName: guessWikivoyagePageName(destinationName, cluster),
    });
    await markStepComplete(buildId, "wikivoyage");
  } catch (error) {
    yield { type: "error", step: "wikivoyage", message: errorMsg(error) };
  }
  yield { type: "wikivoyage_loaded", wikivoyage };

  const matchingAttractions: AttractionWithActivities[] = cluster.attractions;
  const allAttractions = matchingAttractions;

  if (matchingAttractions.length > 0) {
    await supabase
      .from("attractions")
      .update({ destination_id: destination.id })
      .in(
        "id",
        matchingAttractions.map((a) => a.id),
      )
      .is("destination_id", null);
  }

  yield {
    type: "attractions_loaded",
    count: allAttractions.length,
    matching: matchingAttractions.length,
  };

  let googlePlaces: GooglePlace[] = [];
  try {
    const placeQueries = buildGooglePlacesQueries(
      input.selectedActivities,
      destinationName,
    );
    const placeResults = await Promise.all(
      placeQueries
        .slice(0, 5)
        .map((q) =>
          searchPlacesByText({ textQuery: q, bbox: cluster.bbox }),
        ),
    );
    googlePlaces = placeResults.flat();
    const seen = new Set<string>();
    googlePlaces = googlePlaces.filter((p) => {
      if (seen.has(p.place_id)) return false;
      seen.add(p.place_id);
      return true;
    });
    await markStepComplete(buildId, "google_places");
  } catch (error) {
    yield { type: "error", step: "google_places", message: errorMsg(error) };
  }
  yield {
    type: "google_places_loaded",
    count: googlePlaces.length,
    places: googlePlaces,
  };

  yield { type: "ai_synthesis_started" };
  try {
    const result = await getOrCreateDestinationSummary({
      destination,
      selectedActivities: input.selectedActivities,
      attractions: matchingAttractions,
      allAttractions,
      wikivoyage,
      googlePlaces,
      weatherSummary: weatherSummary ?? undefined,
      familyProfile: input.trip?.adults
        ? {
            adults: input.trip.adults,
            children_ages: input.trip.children_ages ?? [],
            travel_style: input.trip.travel_style ?? "mixed",
          }
        : undefined,
    });
    await markStepComplete(buildId, "ai_synthesis");
    yield {
      type: "ai_synthesis_loaded",
      from_cache: result.fromCache,
      summary: result.summary,
      context_hash: result.contextHash,
    };
  } catch (error) {
    yield { type: "error", step: "ai_synthesis", message: errorMsg(error) };
  }

  const totalDuration = Date.now() - startTime;
  await supabase
    .from("destination_builds")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      total_duration_ms: totalDuration,
    })
    .eq("id", buildId);

  yield { type: "complete", duration_ms: totalDuration };
}

export async function* loadCachedDestinationBuild(
  input: DestinationBuildInput,
): AsyncGenerator<BuildEvent, void, undefined> {
  const slug = generateSlug(input.cluster);
  const supabase = createAdminClient();

  const { data: destination } = await supabase
    .from("destinations")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!destination) {
    yield {
      type: "error",
      step: "cache_miss",
      message: "Destination not yet built",
    };
    return;
  }

  yield { type: "destination_ready", destination };

  const { data: summaryRow } = await supabase
    .from("destination_summaries")
    .select("*")
    .eq("destination_id", destination.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  yield { type: "weather_loaded", weather: null };
  yield { type: "wikivoyage_loaded", wikivoyage: null };
  yield {
    type: "attractions_loaded",
    count: input.cluster.attractions.length,
    matching: input.cluster.attractions.length,
  };
  yield { type: "google_places_loaded", count: 0 };

  if (summaryRow) {
    yield {
      type: "ai_synthesis_loaded",
      from_cache: true,
      summary: summaryRow.summary as unknown as DestinationSummary,
      context_hash: summaryRow.context_hash,
    };
  }

  yield { type: "complete", duration_ms: 0 };
}

async function markStepComplete(
  buildId: string,
  step: string,
): Promise<void> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("destination_builds")
    .select("steps_completed")
    .eq("id", buildId)
    .single();

  const current = data?.steps_completed ?? [];
  if (!current.includes(step)) {
    await supabase
      .from("destination_builds")
      .update({ steps_completed: [...current, step] })
      .eq("id", buildId);
  }
}

function errorMsg(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function generateDestinationName(cluster: GeoCluster): string {
  if (cluster.settlement?.name) return cluster.settlement.name;

  const topAttractions = cluster.attractions
    .filter((a) => a.address)
    .slice(0, 3);

  if (topAttractions.length > 0) {
    const cities = topAttractions
      .map((a) => extractCityFromAddress(a.address ?? ""))
      .filter(Boolean) as string[];
    if (cities.length > 0) {
      return cities[0];
    }
  }

  return `Region ${cluster.center.lat.toFixed(2)}, ${cluster.center.lon.toFixed(2)}`;
}

function extractCityFromAddress(address: string): string | null {
  const parts = address.split(",").map((s) => s.trim());
  if (parts.length >= 2) return parts[parts.length - 2] || null;
  return null;
}

export function generateSlug(cluster: GeoCluster): string {
  if (cluster.settlement?.name) {
    const base = cluster.settlement.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return `${base}-${cluster.id.slice(0, 6)}`;
  }
  return `region-${cluster.id}`;
}

function detectCountryFromCluster(cluster: GeoCluster): string | null {
  if (cluster.settlement?.country_code) return cluster.settlement.country_code;
  for (const a of cluster.attractions) {
    if (a.address) {
      const lastPart = a.address.split(",").pop()?.trim();
      if (lastPart && lastPart.length === 2) return lastPart.toUpperCase();
    }
  }
  return null;
}

function guessWikivoyagePageName(name: string, _cluster: GeoCluster): string {
  return name.replace(/^Region: /, "").replace(/\s+/g, "_");
}

function buildGooglePlacesQueries(
  selectedActivities: string[],
  destinationName: string,
): string[] {
  const dest = destinationName.replace(/^Region: /, "");
  const queries: string[] = [];

  const activityToQuery: Record<string, string> = {
    bike_rental: "bike rental",
    ebike_rental: "electric bike rental",
    mountain_biking: "mountain bike rental",
    car_rental: "car rental",
    diving: "scuba diving school",
    snorkeling: "snorkeling tours",
    kayaking: "kayak rental",
    boat_tour: "boat tour",
    quads: "ATV tour quad bike",
    paragliding: "paragliding",
    surfing: "surf school",
    hiking_trails: "hiking tour guide",
    climbing: "rock climbing",
  };

  for (const activity of selectedActivities) {
    const query = activityToQuery[activity];
    if (query) queries.push(`${query} ${dest}`);
  }

  return queries;
}

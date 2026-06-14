import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { findOrCreateDestination, getDestinationBySlug } from "@/lib/api/destinations";
import { fetchOsmPlaces, persistOsmPlaces } from "@/lib/api/osm";
import type { OsmCategory } from "@/lib/api/osm";
import { fetchWikivoyageDestination } from "@/lib/api/wikivoyage";
import { fetchWeatherForRange } from "@/lib/api/weather";
import { withLock } from "@/lib/cache/scrape-lock";
import { createClient } from "@/lib/supabase/server";
import type { BoundingBox, Destination, DestinationType, WeatherSummary } from "@/types/domain";

export const dynamic = "force-dynamic";

const TEST_DESTINATIONS: Record<
  string,
  {
    slug: string;
    name: string;
    countryCode: string;
    type: DestinationType;
    lat: number;
    lon: number;
    bbox: BoundingBox;
    timezone: string;
    wikivoyagePage: string;
  }
> = {
  madeira: {
    slug: "madeira",
    name: "Madeira",
    countryCode: "PT",
    type: "island",
    lat: 32.7607,
    lon: -16.9595,
    bbox: { north: 32.95, south: 32.62, east: -16.27, west: -17.27 },
    timezone: "Atlantic/Madeira",
    wikivoyagePage: "Madeira",
  },
  "albania-south": {
    slug: "albania-south",
    name: "Southern Albania",
    countryCode: "AL",
    type: "region",
    lat: 40.0,
    lon: 19.8,
    bbox: { north: 40.9, south: 39.6, east: 20.6, west: 19.3 },
    timezone: "Europe/Tirane",
    wikivoyagePage: "Southern_Albania",
  },
};

type LogEntry = {
  step: string;
  duration_ms: number;
  result?: unknown;
  error?: string;
};

type ScrapeResult =
  | {
      fromCache: true;
      destination: Destination | null;
      message: string;
    }
  | {
      destination: Destination;
      osm: { fetched: number; categories: OsmCategory[] };
      wikivoyage_title: string | null;
      wikivoyage_sections: string[];
      weather_summary: WeatherSummary;
    };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { slug } = await params;
  const config = TEST_DESTINATIONS[slug];

  if (!config) {
    return NextResponse.json(
      {
        error: `Unknown test destination: ${slug}. Available: ${Object.keys(TEST_DESTINATIONS).join(", ")}`,
      },
      { status: 404 },
    );
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  const log: LogEntry[] = [];

  async function logStep<T>(step: string, fn: () => Promise<T>): Promise<T> {
    const stepStart = Date.now();
    try {
      const result = await fn();
      log.push({ step, duration_ms: Date.now() - stepStart, result });
      return result;
    } catch (error) {
      log.push({
        step,
        duration_ms: Date.now() - stepStart,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  try {
    const result = await withLock<ScrapeResult>({
      lockKey: `test:scrape:${slug}`,
      requestId,
      fallbackOnLocked: async () => {
        const destination = await getDestinationBySlug(slug);
        return {
          fromCache: true,
          destination,
          message: "Another request was building this. Returning cached.",
        };
      },
      action: async () => {
        const destination = await logStep("create_destination", () =>
          findOrCreateDestination({
            slug: config.slug,
            name: config.name,
            countryCode: config.countryCode,
            type: config.type,
            centerLat: config.lat,
            centerLon: config.lon,
            boundingBox: config.bbox,
            timezone: config.timezone,
          }),
        );

        const osmResults = await logStep("fetch_osm", async () => {
          const categories: OsmCategory[] = [
            "tourism_attraction",
            "bicycle_rental",
            "car_rental",
            "beach",
            "viewpoint",
          ];
          const results = await Promise.all(
            categories.map((cat) =>
              fetchOsmPlaces({ bbox: config.bbox, category: cat }),
            ),
          );
          const flat = results.flat();
          await persistOsmPlaces(flat, destination.id);
          return { fetched: flat.length, categories };
        });

        const wikivoyage = await logStep("fetch_wikivoyage", () =>
          fetchWikivoyageDestination({ pageName: config.wikivoyagePage }),
        );

        const today = new Date();
        const dateFrom = new Date(today);
        dateFrom.setDate(today.getDate() + 30);
        const dateTo = new Date(dateFrom);
        dateTo.setDate(dateFrom.getDate() + 7);

        const weather = await logStep("fetch_weather", () =>
          fetchWeatherForRange({
            location: { lat: config.lat, lon: config.lon },
            destinationId: destination.id,
            dateFrom: dateFrom.toISOString().split("T")[0],
            dateTo: dateTo.toISOString().split("T")[0],
          }),
        );

        return {
          destination,
          osm: osmResults,
          wikivoyage_title: wikivoyage?.title ?? null,
          wikivoyage_sections: Object.keys(wikivoyage?.sections ?? {}).filter(
            (key) =>
              wikivoyage?.sections[key as keyof typeof wikivoyage.sections],
          ),
          weather_summary: weather,
        };
      },
    });

    return NextResponse.json({
      success: true,
      total_duration_ms: Date.now() - startTime,
      request_id: requestId,
      log,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        total_duration_ms: Date.now() - startTime,
        log,
      },
      { status: 500 },
    );
  }
}

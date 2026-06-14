import { withLock } from "@/lib/cache/scrape-lock";
import {
  buildDestinationPage,
  loadCachedDestinationBuild,
} from "@/lib/pipeline/destination-builder";
import { createClient } from "@/lib/supabase/server";
import type { GeoCluster } from "@/types/domain";
import { z } from "zod";

export const dynamic = "force-dynamic";

const buildRequestSchema = z.object({
  cluster: z.object({
    id: z.string(),
    center: z.object({ lat: z.number(), lon: z.number() }),
    bbox: z.object({
      north: z.number(),
      south: z.number(),
      east: z.number(),
      west: z.number(),
    }),
    radius_km: z.number(),
    attractions: z.array(z.any()),
    covered_activities: z.array(z.string()),
    score: z.number(),
    activity_counts: z.record(z.string(), z.number()),
  }),
  selected_activities: z.array(z.string()).min(1),
  trip: z
    .object({
      date_from: z.string().optional(),
      date_to: z.string().optional(),
      adults: z.number().int().positive().optional(),
      children_ages: z.array(z.number().int()).optional(),
      travel_style: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = buildRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Validation failed",
        issues: parsed.error.issues,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { cluster, selected_activities, trip } = parsed.data;
  const requestId = crypto.randomUUID();
  const lockKey = `build:destination:${cluster.id}`;

  const buildInput = {
    cluster: cluster as unknown as GeoCluster,
    selectedActivities: selected_activities,
    trip: trip
      ? {
          dateFrom: trip.date_from,
          dateTo: trip.date_to,
          adults: trip.adults,
          children_ages: trip.children_ages,
          travel_style: trip.travel_style,
        }
      : undefined,
    userId: user.id,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };

      try {
        await withLock({
          lockKey,
          requestId,
          fallbackOnLocked: async () => {
            send({
              type: "fallback_lock_busy",
              message: "Another build in progress – loading cached data",
            });
            for await (const event of loadCachedDestinationBuild(buildInput)) {
              send(event);
            }
          },
          action: async () => {
            for await (const event of buildDestinationPage(buildInput)) {
              send(event);
            }
          },
        });
      } catch (error) {
        send({
          type: "error",
          step: "pipeline",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

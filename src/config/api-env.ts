import { z } from "zod";

const apiEnvSchema = z.object({
  GOOGLE_PLACES_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  TRAVELPAYOUTS_TOKEN: z.string().min(1).optional(),
  TRAVELPAYOUTS_MARKER_AVIASALES: z.string().min(1).optional(),
  TRAVELPAYOUTS_MARKER_BOOKING: z.string().min(1).optional(),
});

type ApiEnv = z.infer<typeof apiEnvSchema>;

let cached: ApiEnv | null = null;

function loadApiEnv(): ApiEnv {
  if (!cached) {
    cached = apiEnvSchema.parse({
      GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      TRAVELPAYOUTS_TOKEN: process.env.TRAVELPAYOUTS_TOKEN,
      TRAVELPAYOUTS_MARKER_AVIASALES:
        process.env.TRAVELPAYOUTS_MARKER_AVIASALES,
      TRAVELPAYOUTS_MARKER_BOOKING: process.env.TRAVELPAYOUTS_MARKER_BOOKING,
    });
  }
  return cached;
}

export const apiEnv: ApiEnv = new Proxy({} as ApiEnv, {
  get(_target, prop: keyof ApiEnv) {
    return loadApiEnv()[prop];
  },
});

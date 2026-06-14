import { z } from "zod";

const apiEnvSchema = z.object({
  GOOGLE_PLACES_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
});

type ApiEnv = z.infer<typeof apiEnvSchema>;

let cached: ApiEnv | null = null;

function loadApiEnv(): ApiEnv {
  if (!cached) {
    cached = apiEnvSchema.parse({
      GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    });
  }
  return cached;
}

export const apiEnv: ApiEnv = new Proxy({} as ApiEnv, {
  get(_target, prop: keyof ApiEnv) {
    return loadApiEnv()[prop];
  },
});

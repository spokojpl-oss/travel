import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NODE_ENV: z.enum(["development", "production", "test"]),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

function loadServerEnv(): ServerEnv {
  if (!cached) {
    cached = serverEnvSchema.parse({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      NODE_ENV: process.env.NODE_ENV ?? "production",
    });
  }
  return cached;
}

export const serverEnv: ServerEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: keyof ServerEnv) {
    return loadServerEnv()[prop];
  },
});

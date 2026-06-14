import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NODE_ENV: z.enum(["development", "production", "test"]),
});

export const serverEnv = serverEnvSchema.parse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NODE_ENV: process.env.NODE_ENV,
});

import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

function loadEnv(): Env {
  if (!cached) {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    cached = envSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_URL: appUrl,
    });
  }
  return cached;
}

export const env: Env = new Proxy({} as Env, {
  get(_target, prop: keyof Env) {
    return loadEnv()[prop];
  },
});

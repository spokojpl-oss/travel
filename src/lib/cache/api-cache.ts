import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

type FetchWithCacheOptions<T> = {
  source: string;
  cacheParams: Record<string, unknown>;
  ttlSeconds?: number;
  fetcher: () => Promise<T>;
  forceRefresh?: boolean;
};

export async function fetchWithCache<T>({
  source,
  cacheParams,
  ttlSeconds = 7 * 24 * 60 * 60,
  fetcher,
  forceRefresh = false,
}: FetchWithCacheOptions<T>): Promise<{ data: T; fromCache: boolean }> {
  const cacheKey = buildCacheKey(source, cacheParams);
  const supabase = createAdminClient();

  if (!forceRefresh) {
    const { data: cached } = await supabase
      .from("api_cache")
      .select("data, expires_at")
      .eq("cache_key", cacheKey)
      .single();

    if (cached && new Date(cached.expires_at) > new Date()) {
      return { data: cached.data as T, fromCache: true };
    }
  }

  const freshData = await fetcher();

  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await supabase.from("api_cache").upsert({
    cache_key: cacheKey,
    source,
    data: freshData as Json,
    expires_at: expiresAt,
  });

  return { data: freshData, fromCache: false };
}

function buildCacheKey(
  source: string,
  params: Record<string, unknown>,
): string {
  const sorted = Object.keys(params)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {});

  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(sorted))
    .digest("hex")
    .substring(0, 16);

  return `${source}:${hash}`;
}

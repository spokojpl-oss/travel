import { createAdminClient } from "@/lib/supabase/admin";

export async function acquireLock(
  lockKey: string,
  requestId: string,
  ttlSeconds = 300,
): Promise<boolean> {
  const supabase = createAdminClient();

  await supabase
    .from("scrape_locks")
    .delete()
    .eq("lock_key", lockKey)
    .lt("expires_at", new Date().toISOString());

  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const { error } = await supabase.from("scrape_locks").insert({
    lock_key: lockKey,
    acquired_by: requestId,
    expires_at: expiresAt,
  });

  return !error;
}

export async function releaseLock(
  lockKey: string,
  requestId: string,
): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("scrape_locks")
    .delete()
    .eq("lock_key", lockKey)
    .eq("acquired_by", requestId);
}

export async function waitForLockRelease(
  lockKey: string,
  maxWaitMs = 30000,
): Promise<boolean> {
  const supabase = createAdminClient();
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const { data } = await supabase
      .from("scrape_locks")
      .select("lock_key, expires_at")
      .eq("lock_key", lockKey)
      .single();

    if (!data) {
      return true;
    }

    if (new Date(data.expires_at) < new Date()) {
      await supabase.from("scrape_locks").delete().eq("lock_key", lockKey);
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

export async function withLock<T>({
  lockKey,
  requestId,
  fallbackOnLocked,
  action,
}: {
  lockKey: string;
  requestId: string;
  fallbackOnLocked: () => Promise<T>;
  action: () => Promise<T>;
}): Promise<T> {
  const acquired = await acquireLock(lockKey, requestId);

  if (!acquired) {
    await waitForLockRelease(lockKey);
    return fallbackOnLocked();
  }

  try {
    return await action();
  } finally {
    await releaseLock(lockKey, requestId);
  }
}

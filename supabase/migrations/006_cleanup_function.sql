-- Migracja 006: cleanup function

create or replace function cleanup_expired_cache()
returns table (
  api_cache_deleted bigint,
  scrape_locks_deleted bigint
)
language plpgsql
security definer
as $$
declare
  api_deleted bigint;
  locks_deleted bigint;
begin
  delete from api_cache where expires_at < now();
  get diagnostics api_deleted = row_count;

  delete from scrape_locks where expires_at < now();
  get diagnostics locks_deleted = row_count;

  return query select
    coalesce(api_deleted, 0)::bigint,
    coalesce(locks_deleted, 0)::bigint;
end;
$$;

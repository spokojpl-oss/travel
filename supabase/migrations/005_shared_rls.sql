-- Migracja 005: RLS tabel współdzielonych

alter table destinations enable row level security;
alter table attractions enable row level security;
alter table api_cache enable row level security;
alter table weather_cache enable row level security;
alter table scrape_locks enable row level security;

create policy "Authenticated can read destinations"
  on destinations for select
  to authenticated
  using (true);

create policy "Authenticated can read attractions"
  on attractions for select
  to authenticated
  using (true);

create policy "Authenticated can read api_cache"
  on api_cache for select
  to authenticated
  using (true);

create policy "Authenticated can read weather_cache"
  on weather_cache for select
  to authenticated
  using (true);

create policy "Authenticated can read scrape_locks"
  on scrape_locks for select
  to authenticated
  using (true);

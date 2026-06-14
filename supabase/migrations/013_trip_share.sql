-- Migracja 013: public share access

create or replace function trip_is_shared(trip_uuid uuid, token uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists(
    select 1 from trips
    where id = trip_uuid
      and share_token = token
      and is_share_enabled = true
  );
$$;

create policy "Public reads shared trips"
  on trips for select
  to anon
  using (is_share_enabled = true);

create policy "Public reads docs of shared trips"
  on trip_documents for select
  to anon
  using (
    exists (
      select 1 from trips
      where trips.id = trip_documents.trip_id
        and trips.is_share_enabled = true
    )
  );

create policy "Anyone can log views of shared trips"
  on trip_share_views for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from trips
      where trips.id = trip_share_views.trip_id
        and trips.is_share_enabled = true
    )
  );

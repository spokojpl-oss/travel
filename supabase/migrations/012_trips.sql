-- Migracja 012: trips i dokumenty

create type trip_status as enum ('draft', 'active', 'completed');
create type document_type as enum ('itinerary', 'packing_list', 'pre_trip_todo');

create table trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  destination_id uuid not null references destinations(id) on delete cascade,
  travel_group_id uuid references travel_groups(id) on delete set null,
  date_from date not null,
  date_to date not null,
  status trip_status default 'draft',
  selected_attraction_ids uuid[] default '{}',
  selected_flight_offer_id uuid,
  selected_hotel_offer_id uuid references hotels(id) on delete set null,
  selected_vehicle_config jsonb,
  selected_transport_option jsonb,
  share_token uuid unique default gen_random_uuid(),
  is_share_enabled boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint valid_trip_dates check (date_to >= date_from)
);

create index idx_trips_user on trips(user_id);
create index idx_trips_destination on trips(destination_id);
create index idx_trips_share_token on trips(share_token) where is_share_enabled = true;

create table trip_documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  document_type document_type not null,
  content jsonb not null,
  validation_issues text[] default '{}',
  model_used text not null,
  tokens_used jsonb default '{}',
  created_at timestamptz default now() not null,
  unique (trip_id, document_type)
);

create index idx_trip_docs_trip on trip_documents(trip_id);

create table trip_share_views (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  viewed_at timestamptz default now() not null,
  user_agent_hash text,
  referrer text
);

create index idx_trip_share_views_trip on trip_share_views(trip_id);

create trigger update_trips_updated_at
  before update on trips
  for each row execute function update_updated_at_column();

alter table trips enable row level security;
alter table trip_documents enable row level security;
alter table trip_share_views enable row level security;

create policy "Users view own trips"
  on trips for select using (auth.uid() = user_id);

create policy "Users insert own trips"
  on trips for insert with check (auth.uid() = user_id);

create policy "Users update own trips"
  on trips for update using (auth.uid() = user_id);

create policy "Users delete own trips"
  on trips for delete using (auth.uid() = user_id);

create policy "Users view docs of own trips"
  on trip_documents for select using (
    exists (
      select 1 from trips
      where trips.id = trip_documents.trip_id
        and trips.user_id = auth.uid()
    )
  );

create policy "Users view shares of own trips"
  on trip_share_views for select using (
    exists (
      select 1 from trips
      where trips.id = trip_share_views.trip_id
        and trips.user_id = auth.uid()
    )
  );

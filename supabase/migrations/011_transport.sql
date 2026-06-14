-- Migracja 011: transport i car rentals

create type transport_type as enum (
  'taxi', 'bus', 'train', 'shuttle', 'metro', 'transfer', 'walk'
);

create table airport_transport_baseline (
  id uuid primary key default gen_random_uuid(),
  airport_iata text not null references airports(iata_code) on delete cascade,
  transport_type transport_type not null,
  destination_area text not null,
  distance_km_approx numeric,
  duration_minutes_approx int,
  price_min_pln int not null,
  price_max_pln int not null,
  provider_info text,
  notes text,
  source text default 'manual',
  updated_at timestamptz default now() not null,
  constraint valid_price_range check (price_min_pln <= price_max_pln)
);

create index idx_transport_baseline_airport on airport_transport_baseline(airport_iata);

create table transport_offers_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text unique not null,
  from_airport_iata text not null,
  to_location text not null,
  to_lat numeric(9,6),
  to_lon numeric(9,6),
  pickup_date date not null,
  passengers int not null,
  vehicle_type text not null,
  price_pln int not null,
  provider text not null,
  deep_link text not null,
  raw_data jsonb default '{}',
  fetched_at timestamptz default now() not null,
  expires_at timestamptz not null
);

create index idx_transport_offers_route on transport_offers_cache(from_airport_iata, pickup_date);
create index idx_transport_offers_expires on transport_offers_cache(expires_at);

alter table airport_transport_baseline enable row level security;
alter table transport_offers_cache enable row level security;

create policy "Authenticated read transport_baseline"
  on airport_transport_baseline for select to authenticated using (true);

create policy "Authenticated read transport_offers"
  on transport_offers_cache for select to authenticated using (true);

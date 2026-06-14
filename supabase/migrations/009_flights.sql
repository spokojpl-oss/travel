-- Migracja 009: airports i flight offers

create type airport_size as enum ('large', 'medium', 'small');

create table airports (
  iata_code text primary key,
  icao_code text,
  name text not null,
  city text,
  country_code text not null,
  lat numeric(9,6) not null,
  lon numeric(9,6) not null,
  airport_type airport_size not null,
  scheduled_service boolean default true,
  timezone text,
  constraint valid_iata check (char_length(iata_code) = 3),
  constraint valid_airport_lat check (lat >= -90 and lat <= 90),
  constraint valid_airport_lon check (lon >= -180 and lon <= 180)
);

create index idx_airports_country on airports(country_code);
create index idx_airports_location on airports(lat, lon);
create index idx_airports_type on airports(airport_type);

create table destination_airports (
  destination_id uuid not null references destinations(id) on delete cascade,
  airport_iata text not null references airports(iata_code) on delete cascade,
  distance_km numeric not null,
  priority int default 1,
  primary key (destination_id, airport_iata)
);

create index idx_destination_airports_destination on destination_airports(destination_id);

create table flight_offers_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text unique not null,
  origin_iata text not null,
  destination_iata text not null,
  departure_date date not null,
  return_date date,
  price_pln int not null,
  airline_code text,
  transfers int default 0,
  duration_minutes int,
  deep_link text not null,
  source text not null,
  raw_data jsonb default '{}',
  fetched_at timestamptz default now() not null,
  expires_at timestamptz not null
);

create index idx_flight_offers_route on flight_offers_cache(origin_iata, destination_iata, departure_date);
create index idx_flight_offers_expires on flight_offers_cache(expires_at);
create index idx_flight_offers_price on flight_offers_cache(price_pln);

alter table airports enable row level security;
alter table destination_airports enable row level security;
alter table flight_offers_cache enable row level security;

create policy "Authenticated read airports"
  on airports for select to authenticated using (true);

create policy "Authenticated read destination_airports"
  on destination_airports for select to authenticated using (true);

create policy "Authenticated read flight_offers"
  on flight_offers_cache for select to authenticated using (true);

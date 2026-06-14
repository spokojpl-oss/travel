-- Migracja 004: tabele współdzielone

create type destination_type as enum ('country', 'region', 'city', 'island', 'area');

create table destinations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  country_code text not null,
  destination_type destination_type not null,
  parent_destination_id uuid references destinations(id) on delete set null,
  center_lat numeric(9,6) not null,
  center_lon numeric(9,6) not null,
  bounding_box jsonb not null,
  timezone text not null,
  description text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint valid_lat check (center_lat >= -90 and center_lat <= 90),
  constraint valid_lon check (center_lon >= -180 and center_lon <= 180),
  constraint slug_format check (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$')
);

create index idx_destinations_country on destinations(country_code);
create index idx_destinations_slug on destinations(slug);
create index idx_destinations_parent on destinations(parent_destination_id);

create table attractions (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  source text not null,
  destination_id uuid references destinations(id) on delete set null,
  name text not null,
  description text,
  category text not null,
  subcategories text[] default '{}',
  lat numeric(9,6) not null,
  lon numeric(9,6) not null,
  address text,
  phone text,
  website text,
  opening_hours text,
  tags jsonb default '{}',
  min_age int,
  duration_minutes int,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint valid_attraction_lat check (lat >= -90 and lat <= 90),
  constraint valid_attraction_lon check (lon >= -180 and lon <= 180),
  unique (source, external_id)
);

create index idx_attractions_destination on attractions(destination_id);
create index idx_attractions_category on attractions(category);
create index idx_attractions_location on attractions(lat, lon);
create index idx_attractions_subcategories on attractions using gin(subcategories);

create table api_cache (
  cache_key text primary key,
  source text not null,
  data jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz default now() not null
);

create index idx_api_cache_expires on api_cache(expires_at);
create index idx_api_cache_source on api_cache(source);

create table weather_cache (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references destinations(id) on delete cascade,
  forecast_date date not null,
  temp_min numeric,
  temp_max numeric,
  precipitation_mm numeric,
  precipitation_probability int,
  weather_code int,
  wind_speed_kmh numeric,
  uv_index_max numeric,
  source text not null,
  fetched_at timestamptz default now() not null,
  unique (destination_id, forecast_date)
);

create index idx_weather_cache_destination on weather_cache(destination_id);
create index idx_weather_cache_date on weather_cache(forecast_date);

create table scrape_locks (
  lock_key text primary key,
  acquired_by text not null,
  acquired_at timestamptz default now() not null,
  expires_at timestamptz not null
);

create index idx_scrape_locks_expires on scrape_locks(expires_at);

create trigger update_destinations_updated_at
  before update on destinations
  for each row execute function update_updated_at_column();

create trigger update_attractions_updated_at
  before update on attractions
  for each row execute function update_updated_at_column();

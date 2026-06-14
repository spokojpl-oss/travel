-- Migracja 010: hotele

create table hotels (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  source text not null,
  name text not null,
  lat numeric(9,6) not null,
  lon numeric(9,6) not null,
  stars int,
  property_type text,
  rating numeric(3,1),
  rating_count int,
  address text,
  destination_id uuid references destinations(id) on delete set null,
  amenities jsonb default '{}',
  max_guests int,
  raw_data jsonb default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (source, external_id),
  constraint valid_hotel_lat check (lat >= -90 and lat <= 90),
  constraint valid_hotel_lon check (lon >= -180 and lon <= 180),
  constraint valid_stars check (stars is null or (stars >= 1 and stars <= 5)),
  constraint valid_rating check (rating is null or (rating >= 0 and rating <= 10))
);

create index idx_hotels_destination on hotels(destination_id);
create index idx_hotels_location on hotels(lat, lon);
create index idx_hotels_property_type on hotels(property_type);

create table hotel_offers_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text unique not null,
  hotel_id uuid not null references hotels(id) on delete cascade,
  check_in date not null,
  check_out date not null,
  nights int not null,
  adults int not null,
  children int default 0,
  price_total_pln int not null,
  price_per_night_pln int not null,
  deep_link text not null,
  breakfast_included boolean,
  cancellation_policy text,
  source text not null,
  raw_data jsonb default '{}',
  fetched_at timestamptz default now() not null,
  expires_at timestamptz not null,
  constraint valid_nights check (nights >= 1 and nights <= 60)
);

create index idx_hotel_offers_hotel on hotel_offers_cache(hotel_id);
create index idx_hotel_offers_dates on hotel_offers_cache(check_in, check_out);
create index idx_hotel_offers_expires on hotel_offers_cache(expires_at);

create trigger update_hotels_updated_at
  before update on hotels
  for each row execute function update_updated_at_column();

alter table hotels enable row level security;
alter table hotel_offers_cache enable row level security;

create policy "Authenticated read hotels"
  on hotels for select to authenticated using (true);

create policy "Authenticated read hotel_offers"
  on hotel_offers_cache for select to authenticated using (true);

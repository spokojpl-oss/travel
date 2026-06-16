-- Migracja 017: klimat miesięczny i budżet podróży (Open-Meteo + Numbeo)

create type climate_rating as enum (
  'ideal',
  'good',
  'fair',
  'poor',
  'very_poor'
);

create table destination_climate_monthly (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references destinations(id) on delete cascade,
  month smallint not null check (month between 1 and 12),
  temp_max_avg numeric(5, 2) not null,
  temp_min_avg numeric(5, 2) not null,
  precip_mm_avg numeric(6, 2) not null,
  rainy_days_avg numeric(4, 2) not null,
  climate_rating climate_rating not null,
  source text not null default 'open-meteo-archive',
  sample_years int not null default 14,
  fetched_at timestamptz default now() not null,
  unique (destination_id, month)
);

create index idx_climate_monthly_destination
  on destination_climate_monthly(destination_id);

create index idx_climate_monthly_rating
  on destination_climate_monthly(climate_rating);

create table destination_budget_profiles (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references destinations(id) on delete cascade,
  currency text not null default 'PLN',
  reference_location text not null default 'Warsaw, Poland',
  cpi_index numeric(8, 2),
  cpi_vs_reference_pct numeric(6, 2),
  restaurant_index numeric(8, 2),
  groceries_index numeric(8, 2),
  rent_index numeric(8, 2),
  daily_budget_low numeric(8, 2),
  daily_budget_mid numeric(8, 2),
  daily_budget_high numeric(8, 2),
  sample_prices jsonb not null default '{}',
  source text not null default 'numbeo',
  numbeo_city_id int,
  fetched_at timestamptz default now() not null,
  unique (destination_id, currency)
);

create index idx_budget_profiles_destination
  on destination_budget_profiles(destination_id);

alter table destination_climate_monthly enable row level security;
alter table destination_budget_profiles enable row level security;

create policy "Authenticated read climate monthly"
  on destination_climate_monthly for select to authenticated using (true);

create policy "Authenticated read budget profiles"
  on destination_budget_profiles for select to authenticated using (true);

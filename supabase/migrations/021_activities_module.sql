-- ============================================================
-- Activity Layer Module — Etap 1: Cycling
-- Pure addition. No modifications to existing tables.
-- ============================================================

create extension if not exists postgis;

do $$ begin
  create type activity_category as enum (
    'cycling',
    'hiking',
    'running',
    'water_sports'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type activity_type as enum (
    'cycling_road',
    'cycling_gravel',
    'cycling_mtb',
    'cycling_ebike',
    'cycling_touring'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type activity_difficulty as enum ('easy', 'moderate', 'hard', 'expert');
exception when duplicate_object then null; end $$;

do $$ begin
  create type activity_route_source as enum (
    'osm',
    'ors_generated',
    'komoot',
    'user_curated'
  );
exception when duplicate_object then null; end $$;

create table if not exists activity_routes (
  id uuid primary key default gen_random_uuid(),

  destination_id uuid not null references destinations(id) on delete cascade,

  category activity_category not null,
  activity_type activity_type not null,
  source activity_route_source not null,
  source_external_id text,

  name text not null,
  description text,
  difficulty activity_difficulty,

  distance_m integer not null check (distance_m > 0),
  duration_min integer,
  elevation_gain_m integer,
  elevation_loss_m integer,
  max_gradient_pct numeric(4, 1),

  surface_mix jsonb,
  is_loop boolean not null default false,

  start_point geography(point, 4326) not null,
  end_point geography(point, 4326),
  geometry geography(linestring, 4326) not null,
  elevation_profile jsonb,

  highlights jsonb,
  popularity_score integer default 0,

  external_url text,
  preview_image_url text,

  created_at timestamptz not null default now(),
  cached_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists activity_routes_destination_category_idx
  on activity_routes (destination_id, category);

create index if not exists activity_routes_activity_type_idx
  on activity_routes (activity_type);

create index if not exists activity_routes_start_point_idx
  on activity_routes using gist (start_point);

create index if not exists activity_routes_geometry_idx
  on activity_routes using gist (geometry);

create unique index if not exists activity_routes_destination_source_external_idx
  on activity_routes (destination_id, source_external_id)
  where source_external_id is not null;

alter table activity_routes enable row level security;

drop policy if exists "activity_routes_public_read" on activity_routes;
create policy "activity_routes_public_read"
  on activity_routes for select
  using (true);

-- Migracja 019: kuratorskie regiony turystyczne (bazy noclegowe + picks)

create type region_character as enum ('resort', 'historic', 'wild', 'mixed');
create type region_vibe as enum ('popular', 'balanced', 'offbeat');

create table tourist_regions (
  id text primary key,
  slug text unique not null,
  destination_keys text[] not null default '{}',
  name_pl text not null,
  name_en text not null,
  character region_character not null default 'mixed',
  vibe region_vibe not null default 'balanced',
  overview_pl text not null,
  overview_en text not null,
  stay_hint_pl text not null,
  stay_hint_en text not null,
  center_lat numeric(9, 6) not null,
  center_lon numeric(9, 6) not null,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint tourist_regions_valid_lat check (center_lat >= -90 and center_lat <= 90),
  constraint tourist_regions_valid_lon check (center_lon >= -180 and center_lon <= 180)
);

create index idx_tourist_regions_active on tourist_regions(active) where active = true;
create index idx_tourist_regions_keys on tourist_regions using gin (destination_keys);

create table region_picks (
  id uuid primary key default gen_random_uuid(),
  region_id text not null references tourist_regions (id) on delete cascade,
  day_theme text not null,
  name_pl text not null,
  name_en text not null,
  why_pl text not null,
  why_en text not null,
  activity_slugs text[] not null default '{}',
  rank int not null default 1,
  created_at timestamptz default now() not null,
  constraint region_picks_valid_theme check (
    day_theme in (
      'beach_relax',
      'city_culture',
      'active_outdoor',
      'nature',
      'kids',
      'free'
    )
  )
);

create index idx_region_picks_region on region_picks (region_id);
create index idx_region_picks_theme on region_picks (day_theme);

alter table tourist_regions enable row level security;
alter table region_picks enable row level security;

create policy "Authenticated read tourist regions"
  on tourist_regions for select to authenticated
  using (active = true);

create policy "Authenticated read region picks"
  on region_picks for select to authenticated
  using (
    exists (
      select 1
      from tourist_regions tr
      where tr.id = region_picks.region_id and tr.active = true
    )
  );

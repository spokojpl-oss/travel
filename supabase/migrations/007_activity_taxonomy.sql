-- Migracja 007: taksonomia aktywności

create type intensity_level as enum ('low', 'medium', 'high');
create type weather_dependency as enum ('none', 'low', 'high');

create table activity_groups (
  slug text primary key,
  name_pl text not null,
  name_en text not null,
  description text,
  icon text,
  sort_order int default 0
);

create table activities (
  slug text primary key,
  group_slug text not null references activity_groups(slug) on delete cascade,
  name_pl text not null,
  name_en text not null,
  description text,
  min_recommended_age int,
  requires_license boolean default false,
  intensity intensity_level default 'medium',
  typical_duration_minutes int,
  weather_dependency weather_dependency default 'low',
  sort_order int default 0
);

create index idx_activities_group on activities(group_slug);

create table activity_osm_mappings (
  id uuid primary key default gen_random_uuid(),
  activity_slug text not null references activities(slug) on delete cascade,
  osm_query text not null,
  priority int default 1
);

create index idx_osm_mappings_activity on activity_osm_mappings(activity_slug);

create table attraction_activity_tags (
  attraction_id uuid not null references attractions(id) on delete cascade,
  activity_slug text not null references activities(slug) on delete cascade,
  confidence numeric(3,2) default 1.0,
  primary key (attraction_id, activity_slug),
  constraint valid_confidence check (confidence >= 0 and confidence <= 1)
);

create index idx_attraction_tags_activity on attraction_activity_tags(activity_slug);
create index idx_attraction_tags_attraction on attraction_activity_tags(attraction_id);

alter table activity_groups enable row level security;
alter table activities enable row level security;
alter table activity_osm_mappings enable row level security;
alter table attraction_activity_tags enable row level security;

create policy "Authenticated read activity_groups"
  on activity_groups for select to authenticated using (true);
create policy "Authenticated read activities"
  on activities for select to authenticated using (true);
create policy "Authenticated read osm_mappings"
  on activity_osm_mappings for select to authenticated using (true);
create policy "Authenticated read attraction_tags"
  on attraction_activity_tags for select to authenticated using (true);

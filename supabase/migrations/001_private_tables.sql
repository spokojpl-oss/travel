-- Migracja 001: tabele prywatne

create type member_type as enum ('adult', 'child', 'infant', 'senior');
create type travel_style as enum ('active', 'relax', 'mixed');

create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  default_group_id uuid,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table travel_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_travel_groups_user_id on travel_groups(user_id);

alter table user_profiles
  add constraint fk_default_group
  foreign key (default_group_id)
  references travel_groups(id)
  on delete set null;

create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references travel_groups(id) on delete cascade,
  name text,
  member_type member_type not null,
  age int,
  notes text,
  created_at timestamptz default now() not null,
  constraint child_must_have_age check (
    member_type != 'child' or age is not null
  ),
  constraint age_realistic check (age is null or (age >= 0 and age <= 120))
);

create index idx_group_members_group_id on group_members(group_id);

create table group_preferences (
  group_id uuid primary key references travel_groups(id) on delete cascade,
  travel_style travel_style not null default 'mixed',
  environment_preferences text[] default '{}',
  budget_total_pln int,
  budget_per_person_pln int,
  max_flight_stops int default 2,
  max_flight_duration_hours int,
  accommodation_types text[] default '{}',
  meal_plan_preferences text[] default '{}',
  dietary_restrictions text[] default '{}',
  accessibility_needs text,
  exclusions text[] default '{}',
  polish_speaking_guide_required boolean default false,
  notes text,
  updated_at timestamptz default now() not null
);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_user_profiles_updated_at
  before update on user_profiles
  for each row execute function update_updated_at_column();

create trigger update_travel_groups_updated_at
  before update on travel_groups
  for each row execute function update_updated_at_column();

create trigger update_group_preferences_updated_at
  before update on group_preferences
  for each row execute function update_updated_at_column();

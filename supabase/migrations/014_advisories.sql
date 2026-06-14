-- Migracja 014: advisories

create type advisory_severity as enum ('info', 'suggestion', 'warning', 'critical');
create type advisory_category as enum (
  'flights_dates',
  'airport_choice',
  'open_jaw',
  'accommodation_location',
  'seasonal_event',
  'weather_plan_b',
  'review_red_flag',
  'timing_concern'
);

create table trip_advisories (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  category advisory_category not null,
  severity advisory_severity not null,
  title text not null,
  reasoning text not null,
  suggested_action text,
  source_facts jsonb default '{}',
  estimated_savings_pln int,
  dismissed_at timestamptz,
  dismissed_reason text,
  generated_at timestamptz default now() not null
);

create index idx_trip_advisories_trip on trip_advisories(trip_id);
create index idx_trip_advisories_category on trip_advisories(category);

create table country_holidays (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  holiday_date date not null,
  holiday_name_pl text not null,
  is_recurring_yearly boolean default true,
  impact text,
  severity advisory_severity default 'info'
);

create index idx_country_holidays_country on country_holidays(country_code);
create index idx_country_holidays_date on country_holidays(holiday_date);

alter table trip_advisories enable row level security;
alter table country_holidays enable row level security;

create policy "Users view advisories of own trips"
  on trip_advisories for select using (
    exists (
      select 1 from trips
      where trips.id = trip_advisories.trip_id
        and trips.user_id = auth.uid()
    )
  );

create policy "Users update advisories of own trips"
  on trip_advisories for update using (
    exists (
      select 1 from trips
      where trips.id = trip_advisories.trip_id
        and trips.user_id = auth.uid()
    )
  );

create policy "Authenticated read country_holidays"
  on country_holidays for select to authenticated using (true);

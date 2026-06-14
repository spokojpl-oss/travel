-- Migracja 015: search history + comparisons

create type search_type as enum (
  'activities',
  'destination_build',
  'flights',
  'hotels',
  'transport'
);

create table search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  search_type search_type not null,
  params jsonb not null,
  result_summary jsonb default '{}',
  executed_at timestamptz default now() not null
);

create index idx_search_history_user_time on search_history(user_id, executed_at desc);
create index idx_search_history_type on search_history(search_type);

create table trip_comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  trip_ids uuid[] not null,
  created_at timestamptz default now() not null,
  constraint min_trips check (array_length(trip_ids, 1) >= 2),
  constraint max_trips check (array_length(trip_ids, 1) <= 3)
);

create index idx_trip_comparisons_user on trip_comparisons(user_id);

alter table search_history enable row level security;
alter table trip_comparisons enable row level security;

create policy "Users manage own search history" on search_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own comparisons" on trip_comparisons
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

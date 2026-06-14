-- Migracja 008: tabele dla destination pages i AI summaries

create type build_status as enum ('in_progress', 'completed', 'failed');

create table destination_summaries (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references destinations(id) on delete cascade,
  context_hash text not null,
  selected_activities text[] default '{}',
  family_profile_summary jsonb,
  summary jsonb not null,
  model_used text not null,
  tokens_used jsonb default '{}',
  created_at timestamptz default now() not null,
  expires_at timestamptz not null,
  unique (destination_id, context_hash)
);

create index idx_dest_summaries_destination on destination_summaries(destination_id);
create index idx_dest_summaries_expires on destination_summaries(expires_at);

create table destination_builds (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references destinations(id) on delete cascade,
  build_request_id text not null,
  triggered_by_user uuid references auth.users(id) on delete set null,
  started_at timestamptz default now() not null,
  completed_at timestamptz,
  status build_status default 'in_progress',
  steps_completed text[] default '{}',
  errors jsonb default '{}',
  total_duration_ms int
);

create index idx_dest_builds_destination on destination_builds(destination_id);
create index idx_dest_builds_status on destination_builds(status);

alter table destination_summaries enable row level security;
alter table destination_builds enable row level security;

create policy "Authenticated read summaries"
  on destination_summaries for select to authenticated using (true);

create policy "Authenticated read builds"
  on destination_builds for select to authenticated using (true);

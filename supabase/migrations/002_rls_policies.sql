-- Migracja 002: RLS

alter table user_profiles enable row level security;
alter table travel_groups enable row level security;
alter table group_members enable row level security;
alter table group_preferences enable row level security;

create policy "Users can view own profile"
  on user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on user_profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on user_profiles for insert
  with check (auth.uid() = id);

create policy "Users can view own groups"
  on travel_groups for select
  using (auth.uid() = user_id);

create policy "Users can insert own groups"
  on travel_groups for insert
  with check (auth.uid() = user_id);

create policy "Users can update own groups"
  on travel_groups for update
  using (auth.uid() = user_id);

create policy "Users can delete own groups"
  on travel_groups for delete
  using (auth.uid() = user_id);

create policy "Users can view members of own groups"
  on group_members for select
  using (
    exists (
      select 1 from travel_groups
      where travel_groups.id = group_members.group_id
        and travel_groups.user_id = auth.uid()
    )
  );

create policy "Users can insert members to own groups"
  on group_members for insert
  with check (
    exists (
      select 1 from travel_groups
      where travel_groups.id = group_members.group_id
        and travel_groups.user_id = auth.uid()
    )
  );

create policy "Users can update members of own groups"
  on group_members for update
  using (
    exists (
      select 1 from travel_groups
      where travel_groups.id = group_members.group_id
        and travel_groups.user_id = auth.uid()
    )
  );

create policy "Users can delete members of own groups"
  on group_members for delete
  using (
    exists (
      select 1 from travel_groups
      where travel_groups.id = group_members.group_id
        and travel_groups.user_id = auth.uid()
    )
  );

create policy "Users can view preferences of own groups"
  on group_preferences for select
  using (
    exists (
      select 1 from travel_groups
      where travel_groups.id = group_preferences.group_id
        and travel_groups.user_id = auth.uid()
    )
  );

create policy "Users can insert preferences to own groups"
  on group_preferences for insert
  with check (
    exists (
      select 1 from travel_groups
      where travel_groups.id = group_preferences.group_id
        and travel_groups.user_id = auth.uid()
    )
  );

create policy "Users can update preferences of own groups"
  on group_preferences for update
  using (
    exists (
      select 1 from travel_groups
      where travel_groups.id = group_preferences.group_id
        and travel_groups.user_id = auth.uid()
    )
  );

create policy "Users can delete preferences of own groups"
  on group_preferences for delete
  using (
    exists (
      select 1 from travel_groups
      where travel_groups.id = group_preferences.group_id
        and travel_groups.user_id = auth.uid()
    )
  );

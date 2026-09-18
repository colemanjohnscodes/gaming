-- The Parlor — additive schema for the existing Coleman Johns Admin
-- Supabase project. Creates two new tables only.
--
-- Paste this file into the SQL editor and run it once.
-- Do not create a new Supabase project.
-- Do not drop, alter, or rename existing tables, views, functions, or triggers.

create table public.parlor_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parlor_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.parlor_profiles(id) on delete cascade,
  game text not null default 'snake',
  score int not null check (score >= 0 and score <= 10000),
  duration_ms int not null check (duration_ms >= 0),
  grid_size int not null default 20,
  created_at timestamptz not null default now()
);

create index parlor_scores_game_score_idx
  on public.parlor_scores (game, score desc, created_at asc);

create index parlor_scores_user_idx
  on public.parlor_scores (user_id, created_at desc);

alter table public.parlor_profiles enable row level security;
alter table public.parlor_scores enable row level security;

create policy "parlor_profiles are readable"
  on public.parlor_profiles for select
  to anon, authenticated
  using (true);

create policy "user inserts own parlor_profile"
  on public.parlor_profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "user updates own parlor_profile"
  on public.parlor_profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "parlor_scores are readable"
  on public.parlor_scores for select
  to anon, authenticated
  using (true);

create policy "user inserts own parlor_scores"
  on public.parlor_scores for insert
  to authenticated
  with check (auth.uid() = user_id);

grant select on table public.parlor_profiles to anon, authenticated;
grant insert, update on table public.parlor_profiles to authenticated;

grant select on table public.parlor_scores to anon, authenticated;
grant insert on table public.parlor_scores to authenticated;

grant usage, select on sequence public.parlor_scores_id_seq to authenticated;

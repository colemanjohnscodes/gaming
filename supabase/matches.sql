-- The Parlor — online wager tables.
-- Paste this file into the SQL editor of the existing Coleman Johns Admin
-- project and run it once.
--
-- Creates one new table and five functions. Does not drop, alter, or rename
-- anything already in the project. A wager is not written to the ledger.
--
-- Realtime must be enabled for this project (it is on by default). The browsers
-- talk on a public channel named wager:<code>. Ticks are not stored here.

create table public.parlor_matches (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  status text not null default 'open',
  host_token uuid not null,
  guest_token uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  seated_at timestamptz,
  finished_at timestamptz,
  constraint parlor_matches_code_key unique (code),
  constraint parlor_matches_code_check
    check (code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$'),
  constraint parlor_matches_status_check
    check (status in ('open', 'seated', 'playing', 'finished', 'abandoned'))
);

create index parlor_matches_expires_idx on public.parlor_matches (expires_at);

alter table public.parlor_matches enable row level security;

revoke all on table public.parlor_matches from public, anon, authenticated;

-- Tokens never leave these functions. The table has no client policies.

create or replace function public.open_wager()
returns table (code text, host_token uuid)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  attempt integer := 0;
  next_code text;
  next_token uuid;
  i integer;
begin
  loop
    attempt := attempt + 1;
    if attempt > 8 then
      raise exception 'could not open a table';
    end if;

    next_code := '';
    for i in 1..4 loop
      next_code := next_code || substr(
        alphabet,
        1 + floor(random() * char_length(alphabet))::integer,
        1
      );
    end loop;

    next_token := gen_random_uuid();

    begin
      insert into public.parlor_matches (code, host_token)
      values (next_code, next_token);
      return query select next_code, next_token;
      return;
    exception
      when unique_violation then
        null;
    end;
  end loop;
end;
$$;

create or replace function public.claim_wager(p_code text)
returns table (guest_token uuid, reason text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  match public.parlor_matches%rowtype;
  next_token uuid;
begin
  select * into match
  from public.parlor_matches
  where code = upper(trim(p_code))
  for update;

  if not found then
    guest_token := null;
    reason := 'missing';
    return next;
  end if;

  if match.expires_at <= now()
    or match.status in ('finished', 'abandoned') then
    guest_token := null;
    reason := 'closed';
    return next;
  end if;

  if match.guest_token is not null or match.status <> 'open' then
    guest_token := null;
    reason := 'taken';
    return next;
  end if;

  next_token := gen_random_uuid();

  update public.parlor_matches
  set
    guest_token = next_token,
    status = 'seated',
    seated_at = now()
  where id = match.id;

  guest_token := next_token;
  reason := 'seated';
  return next;
end;
$$;

create or replace function public.resume_wager(p_code text, p_token uuid)
returns table (seat text, status text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  match public.parlor_matches%rowtype;
  next_seat text;
  next_status text;
begin
  select * into match
  from public.parlor_matches
  where code = upper(trim(p_code));

  if not found then
    return;
  end if;

  if match.host_token = p_token then
    next_seat := 'host';
  elsif match.guest_token = p_token then
    next_seat := 'guest';
  else
    return;
  end if;

  if match.expires_at <= now() and match.status in ('open', 'seated') then
    next_status := 'closed';
  else
    next_status := match.status;
  end if;

  seat := next_seat;
  status := next_status;
  return next;
end;
$$;

create or replace function public.confirm_guest(
  p_code text,
  p_host_token uuid,
  p_guest_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  matches boolean;
begin
  select exists (
    select 1
    from public.parlor_matches
    where code = upper(trim(p_code))
      and host_token = p_host_token
      and guest_token = p_guest_token
      and expires_at > now()
      and status in ('seated', 'playing', 'finished')
  ) into matches;

  return matches;
end;
$$;

create or replace function public.mark_wager(
  p_code text,
  p_host_token uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  match public.parlor_matches%rowtype;
begin
  if p_status not in ('playing', 'finished', 'abandoned') then
    return false;
  end if;

  select * into match
  from public.parlor_matches
  where code = upper(trim(p_code))
    and host_token = p_host_token
  for update;

  if not found then
    return false;
  end if;

  if p_status = 'abandoned'
    and match.status in ('open', 'seated', 'playing', 'finished') then
    update public.parlor_matches
    set status = 'abandoned', finished_at = now()
    where id = match.id;
    return true;
  end if;

  if p_status = 'playing'
    and match.guest_token is not null
    and match.status in ('seated', 'finished')
    and match.expires_at > now() then
    update public.parlor_matches
    set
      status = 'playing',
      expires_at = now() + interval '30 minutes',
      finished_at = null
    where id = match.id;
    return true;
  end if;

  if p_status = 'finished' and match.status = 'playing' then
    update public.parlor_matches
    set status = 'finished', finished_at = now()
    where id = match.id;
    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.open_wager() from public, anon, authenticated;
revoke all on function public.claim_wager(text) from public, anon, authenticated;
revoke all on function public.resume_wager(text, uuid) from public, anon, authenticated;
revoke all on function public.confirm_guest(text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.mark_wager(text, uuid, text) from public, anon, authenticated;

grant execute on function public.open_wager() to anon, authenticated;
grant execute on function public.claim_wager(text) to anon, authenticated;
grant execute on function public.resume_wager(text, uuid) to anon, authenticated;
grant execute on function public.confirm_guest(text, uuid, uuid) to anon, authenticated;
grant execute on function public.mark_wager(text, uuid, text) to anon, authenticated;

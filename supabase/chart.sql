-- The Parlor — The Chart.
-- Paste into the SQL editor of the existing Coleman Johns Admin project and run once.
-- Creates two tables and the functions that seal a fleet and answer a call.
-- Does not drop, alter, or rename anything already in the project.
-- A chart is not written to the ledger.
-- Fleets are not readable by the other chair. A shot is marked hit or miss here.

create table public.parlor_charts (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  status text not null default 'open',
  host_token uuid not null,
  guest_token uuid,
  host_fleet jsonb,
  guest_fleet jsonb,
  turn text,
  winner text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours'),
  seated_at timestamptz,
  finished_at timestamptz,
  constraint parlor_charts_code_key unique (code),
  constraint parlor_charts_code_check
    check (code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$'),
  constraint parlor_charts_status_check
    check (status in ('open', 'seated', 'playing', 'finished', 'abandoned')),
  constraint parlor_charts_turn_check
    check (turn is null or turn in ('host', 'guest')),
  constraint parlor_charts_winner_check
    check (winner is null or winner in ('host', 'guest'))
);

create table public.parlor_chart_shots (
  id bigint generated always as identity primary key,
  chart_id uuid not null references public.parlor_charts (id) on delete cascade,
  shooter text not null,
  x int not null,
  y int not null,
  result text not null,
  ship text,
  cells jsonb,
  created_at timestamptz not null default now(),
  constraint parlor_chart_shots_shooter_check check (shooter in ('host', 'guest')),
  constraint parlor_chart_shots_xy_check check (x between 0 and 9 and y between 0 and 9),
  constraint parlor_chart_shots_result_check check (result in ('miss', 'hit', 'sunk')),
  constraint parlor_chart_shots_once unique (chart_id, shooter, x, y)
);

create index parlor_chart_shots_chart_idx on public.parlor_chart_shots (chart_id, id);

alter table public.parlor_charts enable row level security;
alter table public.parlor_chart_shots enable row level security;

revoke all on table public.parlor_charts from public, anon, authenticated;
revoke all on table public.parlor_chart_shots from public, anon, authenticated;

create or replace function public.chart_fleet_valid(p_fleet jsonb)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  ship jsonb;
  ship_name text;
  ship_dir text;
  sx int;
  sy int;
  ship_size int;
  i int;
  seen text[] := '{}';
  taken text[] := '{}';
  key text;
begin
  if p_fleet is null or jsonb_typeof(p_fleet) <> 'array' or jsonb_array_length(p_fleet) <> 5 then
    return false;
  end if;

  for ship in select value from jsonb_array_elements(p_fleet)
  loop
    ship_name := ship->>'name';
    ship_dir := ship->>'dir';
    if (ship->>'x') !~ '^[0-9]+$' or (ship->>'y') !~ '^[0-9]+$' then
      return false;
    end if;
    sx := (ship->>'x')::int;
    sy := (ship->>'y')::int;
    ship_size := case ship_name
      when 'flagship' then 5
      when 'manowar' then 4
      when 'frigate' then 3
      when 'sloop' then 3
      when 'tender' then 2
      else null
    end;
    if ship_size is null or ship_dir not in ('across', 'down') or ship_name = any (seen) then
      return false;
    end if;
    seen := array_append(seen, ship_name);
    for i in 0..(ship_size - 1) loop
      if ship_dir = 'across' then
        if sx + i > 9 or sy > 9 then
          return false;
        end if;
        key := (sx + i)::text || ',' || sy::text;
      else
        if sy + i > 9 or sx > 9 then
          return false;
        end if;
        key := sx::text || ',' || (sy + i)::text;
      end if;
      if key = any (taken) then
        return false;
      end if;
      taken := array_append(taken, key);
    end loop;
  end loop;

  return 'flagship' = any (seen)
    and 'manowar' = any (seen)
    and 'frigate' = any (seen)
    and 'sloop' = any (seen)
    and 'tender' = any (seen);
end;
$$;

create or replace function public.chart_cells(p_fleet jsonb)
returns table (x int, y int, ship text)
language plpgsql
immutable
set search_path = public
as $$
declare
  item jsonb;
  ship_name text;
  ship_dir text;
  sx int;
  sy int;
  ship_size int;
  i int;
begin
  if not public.chart_fleet_valid(p_fleet) then
    return;
  end if;
  for item in select value from jsonb_array_elements(p_fleet)
  loop
    ship_name := item->>'name';
    ship_dir := item->>'dir';
    sx := (item->>'x')::int;
    sy := (item->>'y')::int;
    ship_size := case ship_name
      when 'flagship' then 5
      when 'manowar' then 4
      when 'frigate' then 3
      when 'sloop' then 3
      when 'tender' then 2
      else 0
    end;
    for i in 0..(ship_size - 1) loop
      if ship_dir = 'across' then
        x := sx + i;
        y := sy;
      else
        x := sx;
        y := sy + i;
      end if;
      ship := ship_name;
      return next;
    end loop;
  end loop;
end;
$$;

create or replace function public.open_chart()
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
      raise exception 'could not open a chart';
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
      insert into public.parlor_charts (code, host_token)
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

create or replace function public.claim_chart(p_code text)
returns table (guest_token uuid, reason text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  chart public.parlor_charts%rowtype;
  next_token uuid;
begin
  select * into chart
  from public.parlor_charts
  where code = upper(trim(p_code))
  for update;

  if not found then
    guest_token := null;
    reason := 'missing';
    return next;
  end if;

  if chart.expires_at <= now() or chart.status in ('finished', 'abandoned', 'playing') then
    guest_token := null;
    reason := 'closed';
    return next;
  end if;

  if chart.guest_token is not null or chart.status <> 'open' then
    guest_token := null;
    reason := 'taken';
    return next;
  end if;

  next_token := gen_random_uuid();
  update public.parlor_charts
  set guest_token = next_token, status = 'seated', seated_at = now()
  where id = chart.id;

  guest_token := next_token;
  reason := 'seated';
  return next;
end;
$$;

create or replace function public.resume_chart(p_code text, p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  chart public.parlor_charts%rowtype;
  seat text;
  your_fleet jsonb;
  you_locked boolean;
  them_locked boolean;
  next_status text;
  shots jsonb;
begin
  select * into chart
  from public.parlor_charts
  where code = upper(trim(p_code));

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  if chart.host_token = p_token then
    seat := 'host';
    your_fleet := chart.host_fleet;
    you_locked := chart.host_fleet is not null;
    them_locked := chart.guest_fleet is not null;
  elsif chart.guest_token = p_token then
    seat := 'guest';
    your_fleet := chart.guest_fleet;
    you_locked := chart.guest_fleet is not null;
    them_locked := chart.host_fleet is not null;
  else
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  if chart.expires_at <= now() and chart.status in ('open', 'seated') then
    next_status := 'closed';
  else
    next_status := chart.status;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'x', shot.x,
        'y', shot.y,
        'by', case when shot.shooter = seat then 'you' else 'them' end,
        'result', shot.result,
        'ship', shot.ship,
        'cells', shot.cells
      )
      order by shot.id
    ),
    '[]'::jsonb
  )
  into shots
  from public.parlor_chart_shots shot
  where shot.chart_id = chart.id;

  return jsonb_build_object(
    'ok', true,
    'seat', seat,
    'status', next_status,
    'youLocked', you_locked,
    'opponentLocked', them_locked,
    'yourFleet', your_fleet,
    'turn', case
      when chart.turn is null then null
      when chart.turn = seat then 'you'
      else 'them'
    end,
    'winner', case
      when chart.winner is null then null
      when chart.winner = seat then 'you'
      else 'them'
    end,
    'shots', shots
  );
end;
$$;

create or replace function public.lock_chart(p_code text, p_token uuid, p_fleet jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  chart public.parlor_charts%rowtype;
  seat text;
begin
  if not public.chart_fleet_valid(p_fleet) then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select * into chart
  from public.parlor_charts
  where code = upper(trim(p_code))
  for update;

  if not found or chart.expires_at <= now() or chart.status in ('finished', 'abandoned', 'playing') then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;

  if chart.host_token = p_token then
    seat := 'host';
    if chart.host_fleet is not null then
      return jsonb_build_object('ok', false, 'reason', 'sealed');
    end if;
    update public.parlor_charts set host_fleet = p_fleet where id = chart.id;
  elsif chart.guest_token = p_token then
    seat := 'guest';
    if chart.guest_fleet is not null then
      return jsonb_build_object('ok', false, 'reason', 'sealed');
    end if;
    update public.parlor_charts set guest_fleet = p_fleet where id = chart.id;
  else
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  select * into chart from public.parlor_charts where id = chart.id;

  if chart.host_fleet is not null and chart.guest_fleet is not null then
    update public.parlor_charts
    set
      status = 'playing',
      turn = 'host',
      expires_at = now() + interval '2 hours'
    where id = chart.id;
    return jsonb_build_object('ok', true, 'both', true);
  end if;

  return jsonb_build_object('ok', true, 'both', false, 'seat', seat);
end;
$$;

create or replace function public.fire_chart(
  p_code text,
  p_token uuid,
  p_x int,
  p_y int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  chart public.parlor_charts%rowtype;
  caller text;
  opp jsonb;
  hit_ship text;
  ship_cells int;
  already int;
  shot_result text;
  shot_cells jsonb;
  fleet_cells int;
  covered int;
  next_turn text;
  next_winner text;
begin
  if p_x < 0 or p_x > 9 or p_y < 0 or p_y > 9 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select * into chart
  from public.parlor_charts
  where code = upper(trim(p_code))
  for update;

  if not found or chart.status in ('finished', 'abandoned') then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;

  if chart.host_token = p_token then
    caller := 'host';
    opp := chart.guest_fleet;
  elsif chart.guest_token = p_token then
    caller := 'guest';
    opp := chart.host_fleet;
  else
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  if chart.status <> 'playing' or chart.turn is distinct from caller then
    return jsonb_build_object('ok', false, 'reason', 'wait');
  end if;

  if exists (
    select 1 from public.parlor_chart_shots as earlier
    where earlier.chart_id = chart.id
      and earlier.shooter = caller
      and earlier.x = p_x
      and earlier.y = p_y
  ) then
    return jsonb_build_object('ok', false, 'reason', 'repeat');
  end if;

  select cell.ship into hit_ship
  from public.chart_cells(opp) cell
  where cell.x = p_x and cell.y = p_y;

  shot_cells := null;
  if hit_ship is null then
    shot_result := 'miss';
  else
    select count(*) into ship_cells
    from public.chart_cells(opp) cell
    where cell.ship = hit_ship;

    select count(*) into already
    from public.parlor_chart_shots shot
    join public.chart_cells(opp) cell on cell.x = shot.x and cell.y = shot.y
    where shot.chart_id = chart.id
      and shot.shooter = caller
      and cell.ship = hit_ship;

    if already + 1 >= ship_cells then
      shot_result := 'sunk';
      select jsonb_agg(jsonb_build_object('x', cell.x, 'y', cell.y) order by cell.x, cell.y)
      into shot_cells
      from public.chart_cells(opp) cell
      where cell.ship = hit_ship;
    else
      shot_result := 'hit';
      hit_ship := null;
    end if;
  end if;

  insert into public.parlor_chart_shots (chart_id, shooter, x, y, result, ship, cells)
  values (chart.id, caller, p_x, p_y, shot_result, case when shot_result = 'sunk' then (
    select cell.ship from public.chart_cells(opp) cell where cell.x = p_x and cell.y = p_y
  ) else null end, shot_cells);

  select count(*) into fleet_cells from public.chart_cells(opp);
  select count(*) into covered
  from public.parlor_chart_shots shot
  join public.chart_cells(opp) cell on cell.x = shot.x and cell.y = shot.y
  where shot.chart_id = chart.id
    and shot.shooter = caller
    and shot.result in ('hit', 'sunk');

  if covered >= fleet_cells and fleet_cells > 0 then
    next_winner := caller;
    next_turn := null;
    update public.parlor_charts
    set status = 'finished', winner = caller, turn = null, finished_at = now()
    where id = chart.id;
  else
    next_winner := null;
    next_turn := case when caller = 'host' then 'guest' else 'host' end;
    update public.parlor_charts set turn = next_turn where id = chart.id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'result', shot_result,
    'ship', case when shot_result = 'sunk' then (
      select cell.ship from public.chart_cells(opp) cell where cell.x = p_x and cell.y = p_y
    ) else null end,
    'cells', shot_cells,
    'winner', case
      when next_winner is null then null
      when next_winner = caller then 'you'
      else 'them'
    end,
    'turn', case
      when next_turn is null then null
      when next_turn = caller then 'you'
      else 'them'
    end
  );
end;
$$;

create or replace function public.abandon_chart(p_code text, p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  chart public.parlor_charts%rowtype;
begin
  select * into chart
  from public.parlor_charts
  where code = upper(trim(p_code))
    and (host_token = p_token or guest_token = p_token)
    and status in ('open', 'seated', 'playing')
  for update;

  if not found then
    return false;
  end if;

  update public.parlor_charts
  set status = 'abandoned', finished_at = now()
  where id = chart.id;
  return true;
end;
$$;

revoke all on function public.chart_fleet_valid(jsonb) from public, anon, authenticated;
revoke all on function public.chart_cells(jsonb) from public, anon, authenticated;
revoke all on function public.open_chart() from public, anon, authenticated;
revoke all on function public.claim_chart(text) from public, anon, authenticated;
revoke all on function public.resume_chart(text, uuid) from public, anon, authenticated;
revoke all on function public.lock_chart(text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.fire_chart(text, uuid, int, int) from public, anon, authenticated;
revoke all on function public.abandon_chart(text, uuid) from public, anon, authenticated;

grant execute on function public.open_chart() to anon, authenticated;
grant execute on function public.claim_chart(text) to anon, authenticated;
grant execute on function public.resume_chart(text, uuid) to anon, authenticated;
grant execute on function public.lock_chart(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.fire_chart(text, uuid, int, int) to anon, authenticated;
grant execute on function public.abandon_chart(text, uuid) to anon, authenticated;

# The Parlor — Build Plan

Hand this file to Grok Build from the local clone of:

`https://github.com/colemanjohnscodes/gaming.git`

Brand: **The Parlor**  
Live host (later): `parlor.colemanjohns.com`  
Owner: Coleman Johns, Middle Tennessee. Quiet nod to Belle Meade parlor culture — refined, old-money sitting room that happens to have a game table.

This is an easter-egg arcade on the brand, not a public product launch. No marketing site. If someone finds it, they can play.

Grok Build: execute **Phase 0 → Phase 4** in order. Stop after each phase, commit, and wait if anything is unclear. Do not start Snake Duel until solo Snake is playable and scores save.

---

## Locked product decisions

| Decision | Choice |
|---|---|
| Site name | The Parlor |
| Tagline | A Coleman Johns parlor game |
| Domain | `parlor.colemanjohns.com` (Vercel + DNS later) |
| Look | Old-money parlor, not neon arcade. Dark oxblood / mahogany / cream / antique gold. Thin gold rules, serif wordmark, quiet grain or damask hint. Game board can feel like inlaid wood or marble, not a CRT. |
| Snake walls | Die on wall. No wrap. |
| Auth | Guest may play. Must be logged in to save a score or appear on the ledger |
| Backend | Supabase (Auth + Postgres). Prefer a **new** project named `parlor`. If reusing an existing project, schema `parlor` with RLS. Do not mix with listing/CRM tables. |
| First game | Classic Snake + ledger (leaderboard) |
| Second game | Snake Duel (same engine, two snakes, last alive) |
| Repo | `https://github.com/colemanjohnscodes/gaming.git` |
| Hosting | Vercel, then attach `parlor.colemanjohns.com` |

---

## Voice and copy

Write like a private club card, not a startup landing page.

- Wordmark: **The Parlor**
- Small line under it: `Coleman Johns · Middle Tennessee`
- Snake card title: **The Serpent** (UI can still route to `/play/snake`)
- Duel card: **A Private Wager** — soon
- Leaderboard: **The Ledger**
- Save score: **Enter the ledger**
- Death: **The house holds.** / **Withdrawn.**
- Play again: **Another hand**
- Login: **Leave a name**
- Footer: `The Parlor is a Coleman Johns parlor game. Not a listing.`
- 404: `This room is closed.`

Do not use neon, magenta, cyan, “arcade,” “high score,” or “game on.”

---

## Stack

- Next.js App Router + TypeScript + Tailwind CSS v4
- Game loop: requestAnimationFrame + HTML canvas (no Phaser/Unity)
- Supabase JS client
- Auth: email magic link first
- Deploy: Vercel + later custom domain `parlor.colemanjohns.com`
- No game engine framework. No Socket.io server. No extra backend.

Env vars (`.env.local`, never commit secrets):

```
NEXT_PUBLIC_APP_NAME=The Parlor
NEXT_PUBLIC_SITE_HOST=parlor.colemanjohns.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Visual system (Phase 0)

Palette:

- Background `#1a1210` (near-black mahogany)
- Panel `#2a1c18`
- Cream text `#f3ead8`
- Muted text `#b7a894`
- Antique gold `#c6a35a`
- Oxblood `#6e1f2a` for danger / death
- Hairline gold borders, 1px

Type:

- Wordmark and headings: a serif (e.g. `Playfair Display` or `Cormorant Garamond` via `next/font`)
- UI and scores: a clean sans (`Source Sans 3` or system)

Motion: almost none. No scanlines, no glow pulse, no chrome gradients.

Component name `ParlorPanel` instead of `NeonPanel`.

---

## Repo layout

Initialize Next.js **in the repo root**.

```
/
  PLAN.md
  AGENTS.md
  README.md
  package.json
  app/
    layout.tsx
    page.tsx
    play/snake/page.tsx
    leaderboard/page.tsx
    auth/callback/route.ts
    login/page.tsx
  components/
    SiteHeader.tsx
    SiteFooter.tsx
    ParlorPanel.tsx
    AuthButton.tsx
    LeaderboardTable.tsx
  games/snake/
    engine.ts
    render.ts
    input.ts
    types.ts
    constants.ts
    SnakeGame.tsx
    DuelGame.tsx
  lib/
    supabase/client.ts
    supabase/server.ts
    supabase/middleware.ts
    scores.ts
    pending-score.ts
  supabase/
    schema.sql
  public/
    favicon.ico
```

`games/snake/engine.ts` must stay UI-free so Duel can reuse it.

---

## Phase 0 — Repo + app shell

1. Confirm cwd is the clone of `colemanjohnscodes/gaming`.
2. Scaffold Next.js in the repo root (`create-next-app` or manual files if PLAN/AGENTS already exist).
3. Apply the parlor visual system above.
4. Home page:
   - Wordmark **The Parlor**
   - Line: Coleman Johns · Middle Tennessee
   - Primary card: **The Serpent** → `/play/snake`
   - Ghost card: **A Private Wager** — soon
   - Link to **The Ledger** → `/leaderboard`
5. Header: The Parlor, Play, The Ledger, Leave a name / Account.
6. README: what it is, local run, env vars, future domain `parlor.colemanjohns.com`.
7. Commit: `chore: scaffold The Parlor`

Do not add Supabase yet.

---

## Phase 1 — Snake, local only

Rules:

- Grid 20×20 (responsive canvas, integer cell size).
- Start length 3, moving right.
- Food on a random empty cell.
- Eat: +1 score, +1 segment, speed up every 5 food (capped).
- Hit wall → dead. Hit self → dead. No wrap.
- No reverse into yourself.
- Controls: arrows + WASD + swipe + on-screen d-pad.
- Space or tap to pause.
- Death overlay: score, **Another hand**, **Enter the ledger** (login until Phase 3).
- Sound off by default; skip sound if it slows the phase.

Render the board as a dark wood/marble grid with gold food and a cream-and-oxblood snake — still readable, not a cartoon.

Engine API:

```ts
createGame(config) -> state
tick(state) -> state
turn(state, dir) -> state
```

Commit: `feat: playable snake`

Done when `/play/snake` plays with a keyboard, dies on the wall, and restarts.

---

## Phase 2 — Supabase schema

Create `supabase/schema.sql` and apply it in the SQL editor.

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  game text not null default 'snake',
  score int not null check (score >= 0 and score <= 10000),
  duration_ms int not null check (duration_ms >= 0),
  grid_size int not null default 20,
  created_at timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game, score desc, created_at asc);
create index scores_user_idx on public.scores (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.scores enable row level security;

create policy "profiles are readable"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "user inserts own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "user updates own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "scores are readable"
  on public.scores for select
  to anon, authenticated
  using (true);

create policy "user inserts own scores"
  on public.scores for insert
  to authenticated
  with check (auth.uid() = user_id);
```

Auth (human clicks, document in README):

- Site URL: `http://localhost:3000`, preview URLs, then `https://parlor.colemanjohns.com`
- Redirect: `/auth/callback`
- Enable email magic link

Trigger: on `auth.users` insert, create `profiles` with email-prefix display name.

Soft anti-cheat in `lib/scores.ts`:

- Reject score `> 400` on 20×20 unless duration is plausible
- Reject if `score > duration_ms / 250`

Commit: `feat: supabase schema and score helpers`

---

## Phase 3 — Auth + ledger

1. Guest plays with no account.
2. Death stores pending score in `sessionStorage`.
3. **Enter the ledger** → `/login?next=/play/snake`.
4. Magic link → `/auth/callback` → insert pending score → “Recorded.” → clear pending.
5. Logged-in players save from the death screen immediately.
6. Display name from email; optional `/account` later.

Pages:

- `/login` — email, send link
- `/leaderboard` — The Ledger: Today / All time, top 25
- Home: five names from the all-time ledger

Commit: `feat: auth and ledger`

---

## Phase 4 — Polish + Vercel

- Mobile canvas + d-pad do not collide
- `prefers-reduced-motion`
- Meta: `The Parlor · Coleman Johns`
- 404: `This room is closed.`
- README: attach custom domain `parlor.colemanjohns.com` after first Vercel deploy

Launch checklist (human):

1. Push `main` to GitHub
2. New Vercel project from this repo
3. Set Supabase env vars
4. Add Vercel URL + `https://parlor.colemanjohns.com` to Supabase Auth redirects
5. Play, login, confirm a `scores` row
6. When ready (not required for first preview): DNS CNAME `parlor` → Vercel

Commit: `chore: launch polish`

**Preview launch is enough.** Custom domain can wait. Snake Duel is not required.

---

## Phase 5 — Snake Duel (after live)

Reuse `games/snake/engine.ts`. UI label: **A Private Wager**.

- Same 20×20 grid
- Local 1v1 first (one keyboard): P1 WASD, P2 arrows
- Online rooms second

Local rules: wall/self kill; head-into-body loses; simultaneous head-to-head is a draw; first to 10 food or last alive; rematch; no ledger until online.

Online later: `matches` table, `/play/duel?room=ABCD`, Supabase Realtime, host-authoritative tick.

Commit 1: `feat: local snake duel`  
Commit 2: `feat: online snake duel rooms`

---

## What Grok Build must not do

- Do not require an account to play
- Do not wrap Snake through walls
- Do not install Phaser, Three.js, Socket.io, Prisma, or a custom server
- Do not put secrets in the client beyond the anon key
- Do not mix parlor tables into listing/CRM schemas
- Do not build extra games, shops, ads, or chat in v1
- Do not invent a second repo
- Do not use neon arcade styling

---

## Suggested first Grok Build prompt

```
Read PLAN.md and AGENTS.md.

Phase 0 only: scaffold the Next.js app in this repo root
(https://github.com/colemanjohnscodes/gaming.git) as The Parlor —
mahogany / cream / antique gold parlor aesthetic, home page with
The Serpent card. No Supabase and no game engine yet.
Commit when the home page runs at npm run dev.
```

Then Phase 1, 2, 3, 4.

---

## Definition of done for v1

- `npm run dev` plays Snake
- Wall collision kills
- Guest can play
- Logged-in user can record a score on The Ledger
- Production URL on Vercel from this repo
- Ready to point `parlor.colemanjohns.com` when you want it public-to-the-curious

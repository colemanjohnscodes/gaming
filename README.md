# The Parlor

A Coleman Johns parlor game. Not a listing.

Quiet table in a Middle Tennessee sitting room. If someone finds it, they can play.

Future host: `parlor.colemanjohns.com`

## Local run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run lint
npm run build
```

## Environment

Copy `.env.example` to `.env.local`. Do not commit `.env.local` or secrets.

```
NEXT_PUBLIC_APP_NAME=The Parlor
NEXT_PUBLIC_SITE_HOST=parlor.colemanjohns.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

The Parlor uses the existing Coleman Johns Admin Supabase project. Put that project's URL and anon key in `.env.local`. Do not create a new Supabase project.

## Schema

The ledger tables are not applied automatically. In the **existing** Admin project SQL editor, paste and run `supabase/schema.sql` once.

That script only creates:

- `public.parlor_profiles`
- `public.parlor_scores`

It does not drop, alter, or rename anything already in the project. It does not add a trigger on `auth.users`. Leave Auth settings unchanged until Phase 3.

Guests may play The Serpent with no account. Saving a name to The Ledger is not wired yet.

## Domain

First deploy is Vercel from this repo. Attach `parlor.colemanjohns.com` after that preview is live.

See `PLAN.md` and `AGENTS.md`.

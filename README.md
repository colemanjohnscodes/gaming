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

It does not drop, alter, or rename anything already in the project. It does not add a trigger on `auth.users`. Profiles are created in app code on first save.

Guests may play The Serpent with no account. To appear on The Ledger, leave a name with the magic-link letter.

## Auth (human)

In the existing Admin project Auth settings (do this in the dashboard, not from this repo):

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`
- Email magic link enabled

Do not point Auth at listing/CRM apps for this sitting. Preview and `https://parlor.colemanjohns.com` can be added later.

## Domain

First deploy is Vercel from this repo. Attach `parlor.colemanjohns.com` after that preview is live.

See `PLAN.md` and `AGENTS.md`.

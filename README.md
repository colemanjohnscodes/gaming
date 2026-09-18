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

Copy `.env.example` to `.env.local`. Do not commit secrets.

```
NEXT_PUBLIC_APP_NAME=The Parlor
NEXT_PUBLIC_SITE_HOST=parlor.colemanjohns.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Supabase is not wired yet. Guests may play without an account once The Serpent is at the table.

## Domain

First deploy is Vercel from this repo. Attach `parlor.colemanjohns.com` after that preview is live.

See `PLAN.md` and `AGENTS.md`.

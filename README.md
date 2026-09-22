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

Guests may play The Hedge with no account. To appear on The Ledger, leave a name with the magic-link letter.

A Private Wager at `/play/duel` can be two chairs at one keyboard, or two houses joined by a four-letter code. It is not written to The Ledger.

Online tables need one more script. In the same SQL editor, paste and run `supabase/matches.sql` once. Realtime must be enabled on the project (it is, by default). That script only creates `public.parlor_matches` and the functions that open, claim, and close a table.

Both players open the same site. A code on `localhost` is not visible to another computer. Use the deployed URL.

The Volley at `/play/volley` uses those same table codes. One browser keeps the ball.

The Chart at `/play/chart` needs one more script: paste and run `supabase/chart.sql` once. Each fleet is sealed in the book, and a call is marked hit or miss from that seal. The other chair cannot read the fleet. A chart is not written to the ledger.

## Auth (human)

In the existing Admin project Auth settings (do this in the dashboard, not from this repo):

- Site URL: `http://localhost:3000` for local work
- Redirect URL: `http://localhost:3000/auth/callback`
- Email magic link enabled

After a Vercel preview exists, add that URL and `/auth/callback` as well. When the parlor host is attached, add `https://parlor.colemanjohns.com` and `https://parlor.colemanjohns.com/auth/callback`.

Do not point Auth at listing/CRM apps for this sitting.

### Letter copy (human)

SMTP can send from a Coleman Johns address. The wording of the letter is still an Auth template.

In **Authentication → Email Templates**, paste:

- Magic Link — subject `A letter from The Parlor`, body from `supabase/emails/magic-link.html`
- Confirm signup — subject `A letter from The Parlor`, body from `supabase/emails/confirm-signup.html`

Keep `{{ .ConfirmationURL }}` in the body. That is the seat held in the letter.

## Deploy (Vercel)

Preview is enough for first launch. The custom domain can wait.

1. Push `main` to `https://github.com/colemanjohnscodes/gaming.git`.
2. In Vercel, create a **new project from this repo**. Root directory is the repo root. Framework: Next.js.
3. Set the same public env vars as `.env.example` (Supabase URL and anon key from the existing Admin project). Do not put a service-role key in the browser.
4. In the Admin project Auth settings, add the Vercel URL and its `/auth/callback` redirect.
5. Play The Hedge, leave a name, confirm a row in `public.parlor_scores`.

When you want `parlor.colemanjohns.com` (not required for preview):

6. In Vercel, add the domain `parlor.colemanjohns.com`.
7. In DNS, CNAME `parlor` to Vercel. Do not change DNS from this repo.

See `PLAN.md` and `AGENTS.md`.

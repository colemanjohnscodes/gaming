# AGENTS.md — The Parlor

## What this repo is

`https://github.com/colemanjohnscodes/gaming.git`

**The Parlor** — a Coleman Johns parlor game. Future host: `parlor.colemanjohns.com`.
First ship: Snake (The Serpent) + The Ledger. Next: Snake Duel (A Private Wager).

Read `PLAN.md`. Do only the current phase.

## Brand

Old-money Middle Tennessee parlor. Belle Meade nod. Serif wordmark, mahogany, cream, antique gold. Not neon. Not “arcade.”

## Conventions

- TypeScript strict. No `any`.
- App Router. Game canvas is a client component.
- Tailwind only.
- Rules in `games/snake/engine.ts`. React only mounts, inputs, renders.
- Supabase anon key only in the browser.
- Commits: `feat:` / `fix:` / `chore:`, one phase per commit when possible.

## Commands

```
npm run dev
npm run lint
npm run build
```

## Do

- Keep phases small.
- Guest play works without auth.
- Ask before adding dependencies not in PLAN.md.

## Don't

- Don't wrap Snake walls.
- Don't block play behind login.
- Don't start Phase 5 until v1 is on Vercel.
- Don't use neon / magenta / cyan styling.

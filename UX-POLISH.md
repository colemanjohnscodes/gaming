# The Parlor — UX & copy polish

For Grok Build after Phase 4. Visual direction is already correct: mahogany, cream, antique gold, serif wordmark, quiet damask. Do not go neon. Do not add games. This pass is names, hierarchy, and the ledger.

Repo: `https://github.com/colemanjohnscodes/gaming.git`

---

## What is wrong in the current home

1. The room is empty. Hero + two cards + five raw rows, then a field of damask. A parlor should feel furnished, not like a landing page that ran out of content.
2. The Ledger lists every sitting as a new row. Five “Brandon Johns” is a log, not a ledger. Show **best score per name**, one row each.
3. The two cards weigh the same. The Serpent is open. A Private Wager is not. The closed room should look closed.
4. “The Serpent” is a little Sunday-school. The rest of the voice is Belle Meade sitting room.
5. No ranks, no dates, no “this evening / all time.”
6. Header “Play” is vague when there is one table.

---

## Names (locked for this pass)

| Current | Use this | Why |
|---|---|---|
| The Serpent | **The Hedge** | Estate garden / boxwood. You die on the wall — you hit the hedge. Still a snake. |
| Take a seat | **Sit down** | Shorter. Same courtesy. |
| A Private Wager | keep | Already the best line on the page. |
| Two chairs. Last alive. | keep | |
| soon | **The table is reserved** | Closed-room language. |
| The Ledger | keep | |
| Leave a name | keep | |
| Play (header) | **The Hedge** | Deep-link the only live table. |
| The house holds. | keep on death | |
| Enter the ledger | keep | |
| Another hand | **Again** | Less poker, still parlor. |

Home eyebrow under the gold rule (add one line):

`A private table. Not a listing.`

Do not add “arcade,” “games,” “high score,” or “play now.”

---

## Home layout

Keep the wordmark. Tighten everything under it so the first screen feels finished.

```
header
The Parlor
Coleman Johns · Middle Tennessee
———
A private table. Not a listing.

[ The Hedge     | full color, gold rule, Sit down → ]
[ A Private Wager | muted 55%, dashed or thinner rule, not a link ]
                  The table is reserved

The Ledger
Evening · All time     (text tabs, gold underline on active)
I    Name           24
II   Name           18
III  Name           12
     View the full ledger →
```

Rules:

- Max width ~720px for the cards. They are too wide and too short now.
- The Hedge card: slightly taller, cream title, gold “Sit down.”
- Wager card: lower contrast (`opacity-60`), no hover lift, `cursor-default`, `aria-disabled`.
- Ledger on home: **top 5 unique names by best score**, not last 5 sits.
- Rank in roman numerals for 1–3 (`I II III`), then blank or arabic.
- Link the heading “The Ledger” to `/leaderboard`.
- If ledger is empty: one line, `The book is still clean.` Do not show five zeros.
- Collapse the dead damask below. Footer should sit closer — padding-bottom, not a second viewport of wallpaper.

---

## The Ledger page (`/leaderboard`)

Treat it like a club book, not a CRM table.

- Title: **The Ledger**
- Line under: `Best sitting of The Hedge`
- Tabs: **This evening** (America/Chicago midnight) and **All time**
- Columns: rank · name · score · sittings (optional count)
- One row per display name (MAX score). Do not list every game.
- Gold on rank I only.
- Signed-in user’s row: a quiet cream highlight, no neon.
- Empty evening: `No one has sat this evening.`

Update `listParlorScores` (or add `listParlorBest`) so this is a grouped query, not a filter in React.

---

## Display names

“Brandon Johns” five times is the email-derived profile. Fine for now, but:

- On first ledger save, if they have not set a parlor name, prompt **What shall we call you?** (2–20 chars).
- Default suggestion: first name only (`Brandon`), not full legal name.
- Header when signed in: that parlor name, not “Leave a name.”
- Do not change other Coleman Johns Auth users or the admin dashboard.

---

## Header / footer

Header:

- Left: **The Parlor** (home)
- Right: **The Hedge** · **The Ledger** · name or **Leave a name**

Footer, single centered line, more margin above it:

`The Parlor is a Coleman Johns parlor game. Not a listing.`

Remove the Next.js “N” badge if it is from the dev overlay only; ignore if it is localhost.

---

## Micro-motion and type

- No bounce, no glow pulse.
- Card hover on The Hedge only: 1px gold brighten, 120ms.
- Keep Playfair / Cormorant for titles. Do not mix in a third display font.
- Letter-spacing on the small caps (`Coleman Johns · Middle Tennessee`, `The Ledger`) can stay.

---

## Out of scope

- Snake Duel
- New tables other than a query change
- Auth / SMTP / DNS
- New color palette
- Illustrations of snakes or houses
- Sound

---

## Grok Build prompt

```
Read PLAN.md, AGENTS.md, and UX-POLISH.md.

Implement the polish pass only.

Rename The Serpent → The Hedge in all UI copy (routes may stay
/play/snake). Home: tighter card width, live card vs reserved card,
eyebrow “A private table. Not a listing.”

Ledger on home and /leaderboard: best score per display name,
not every sitting. Tabs This evening / All time. Roman ranks I–III.
Empty states from UX-POLISH.md.

Header: The Hedge · The Ledger · Leave a name.
Death overlay: “Again” instead of “Another hand.”
First-save name prompt if display_name looks like a full legal
name / email prefix — prefer first name. Do not touch Auth
settings or any table except parlor_profiles / parlor_scores.

No Duel. No neon. Commit: polish: parlor home and ledger
```

# `[APP_NAME]` — Magppie HR

In-house HR application for **Magppie**, a manufacturer of engineered-stone kitchens,
intended to replace Keka. Phone-first, because most of the workforce is on a factory
floor, a showroom floor or a client site rather than at a desk.

> **The product name has not been chosen.** The app renders the literal placeholder
> `[APP_NAME]`, defined once in `src/lib/constants.ts`. Changing it is a one-line change.

> **This repository has a temporary home.** It belongs to the Magppie GitHub account
> (`Magppie1234`) and is to be transferred there. It sits under `jiyasiwach` only because
> that is the account with push access on the machine it was built on.

**Live:** https://magppie-hr-app.vercel.app

---

## Status at a glance

| | |
| --- | --- |
| Front end | **Complete** for the current scope, deployed |
| Data | **100% invented mock data**, in memory, resets on reload |
| Backend | **Designed, not applied** — four migrations in `supabase/migrations/`, never run |
| Auth | **None.** A role switcher stands in for sign-in. |
| Tests | **None automated.** Manual checklist in `docs/12-testing.md`. |

**New here — including if you are an AI assistant — read [`AI_MEMORY.md`](AI_MEMORY.md)
first.** It contains the hard constraints, the decisions already taken, and the 24 open
questions that were deliberately flagged rather than guessed.

---

## Stack

Next.js 16 (App Router) · TypeScript · **plain CSS Modules** — no Tailwind, no UI library ·
React 19 · Inter via `next/font` · Supabase (Postgres) for the backend.

---

## Getting started

```bash
git clone https://github.com/jiyasiwach/magppie-hr-app.git
cd magppie-hr-app
npm install
cp .env.example .env.local     # optional today — the app runs on mocks
npm run dev -- -p 3040
```

Open http://localhost:3040.

Port 3040 avoids collisions with other Magppie projects (3020, 3021, 3060, 3080).

### Trying it out
Use the **role switcher** in the top bar (or in the account drawer on a phone) to move
between the three views:

| Persona | Sees |
| --- | --- |
| **Employee** — Priya Sharma | Own records; department colleagues |
| **Manager** — Vikram Nair | Eight reports, an approvals queue, team calendars |
| **HR admin** — Imran Qureshi | Everything, plus editing and organisation settings |

Worth opening: **Home** (clock in and watch the timer), **Inbox** as the manager,
**My Leave → "How was this balance worked out?"**, and **Settings → Review aids**, which
force the loading, empty and error states so you can check them rather than trust them.

---

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server (pass `-- -p 3040`) |
| `npm run build` | Production build |
| `npm start` | Serve the build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |

There is no `test` script because there are no tests.

---

## Configuration

Two variables, both public by design — see `docs/09-integrations-and-env.md`.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon / publishable key>
```

There is deliberately **no service-role key**. Nothing needs to bypass row-level security,
and a service key in a Next.js project is one careless import away from the browser.

Until these are filled in the app still runs — it never constructs a Supabase client while
on mock data.

---

## Backend setup (not yet done)

1. Create a Supabase project: org `Magppie1234's Org`, name `magppie-hr-prod`, region
   `ap-southeast-1`.
2. Apply `supabase/migrations/0001` → `0004` in order.
3. Run the Supabase advisors; fix what they flag.
4. Copy the URL and anon key into `.env.local` and into Vercel.
5. Configure Google OAuth (needs a Workspace admin) — `docs/10-authentication.md`.

---

## Deployment

```bash
npx vercel@latest --prod --yes
```

Manual, from a machine with the Vercel CLI signed in. There is no CI. Transferring the
repo to `Magppie1234` unlocks git-linked auto-deploy on the Magppie Vercel team —
see `docs/11-deployment.md`.

---

## Three things that are deliberately not real

They say so on screen rather than pretending, and that is intentional. **Do not "fix"
them by faking success.**

1. **No file storage** — documents are records; the Download button explains there is
   nothing behind it; a post's image is a caption.
2. **Salary and Expenses** show an explicit not-configured state. There is no expense
   policy to validate against and no payroll.
3. **The feedback form** says plainly that nothing was sent, because there is nowhere for
   it to go yet.

Everything else does what it looks like it does, including the writes.

---

## Documentation

| File | Contents |
| --- | --- |
| [`AI_MEMORY.md`](AI_MEMORY.md) | **Start here.** Constraints, conventions, decisions, philosophy |
| [`docs/01`](docs/01-project-overview.md) | Vision, scope, features, roles, roadmap |
| [`docs/02`](docs/02-conversation-history.md) | Full project history, including rejected ideas |
| [`docs/03`](docs/03-architecture.md) | Layers, state, module responsibilities |
| [`docs/04`](docs/04-database.md) | Schema, ER diagram, RLS |
| [`docs/05`](docs/05-api.md) | RPC and REST surface |
| [`docs/06`](docs/06-ui-ux.md) | Design system, screens, flows, accessibility |
| [`docs/07`](docs/07-business-logic.md) | Every calculation and edge case |
| [`docs/08`](docs/08-workflows.md) | Step-by-step workflows |
| [`docs/09`](docs/09-integrations-and-env.md) | Integrations, environment variables |
| [`docs/10`](docs/10-authentication.md) | Auth and authorisation |
| [`docs/11`](docs/11-deployment.md) | Hosting, CI, backups |
| [`docs/12`](docs/12-testing.md) | Manual checklist, proposed suite |
| [`docs/13`](docs/13-bugs-and-open-questions.md) | Bugs and the open questions |
| [`docs/14`](docs/14-backlog.md) | Prioritised backlog |
| [`docs/15`](docs/15-code-reference.md) | Every module and export |
| [`docs/16`](docs/16-folder-structure.md) | Directory map |

---

## Troubleshooting

**The app shows `[APP_NAME]` everywhere.** Correct — the name has not been chosen.

**`Supabase is not configured`.** You called `createClient()` without env vars. The app on
mock data never does; fill in `.env.local` if you are wiring the backend.

**Everything I changed disappeared after a reload.** Expected. The store is in memory.

**Dates look wrong / it is always 9 September 2026.** `MOCK_TODAY` in `src/lib/clock.ts`
pins the app so screens are deterministic. The Home timer deliberately uses real time.

**Lint fails with "Cannot call impure function during render".** React 19's purity rule.
Do not call `Date.now()` in render — use `useNow()` from `src/hooks/useTicker.ts`.

**`repo_no_access` when linking Vercel to GitHub.** The Magppie Vercel team's GitHub app
can only see the `Magppie1234` org; the repo is under `jiyasiwach`. Transfer it.

**Commits show the wrong author.** The machine's global git identity is
`SUNROOOF <sunrooof@Magppie.local>`. This repo overrides it locally to
`Magppie <info@mymagppie.com>`. Keep the override.

**Port 3040 is busy.** `lsof -ti:3040 | xargs kill`.

---

## FAQ

**Why no Tailwind?** The project owner chose plain CSS Modules.

**Why is the palette brown and beige?** It is the owner's specified direction. Status
colours are deliberately *not* brown — people must not misread their own attendance.

**Why is muted text `#6E5F50` when the brief says `#7A6A5A`?** The briefed value measured
4.32:1 on the page and 3.90:1 on the chrome, both below WCAG AA. The brief's own rule said
contrast must be checked rather than assumed.

**Why can I not delete anything?** By design. Records go inactive, cancelled or archived.
Punches cannot even be updated — a wrong day is corrected by a regularisation, which
leaves a trail.

**Why is there a role switcher instead of a login?** The brief forbade faking a login. One
function, `getCurrentUser()`, decides who is signed in; the switcher changes what it
returns. Real auth replaces that one function.

**Why are balances not stored?** So every number can show its working. A balance is the
sum of its ledger.

**Can I copy screens from Keka?** No. Follow how it *works*; never reproduce its design,
icons, wording or layouts.

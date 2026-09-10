# AI_MEMORY.md

**Read this file first. It is written for an AI assistant picking this project up cold.**

Everything here is true as of 10 September 2026. Where something does not exist,
this file says so rather than describing what it would look like. Do not infer
that a section describes working code unless it says it does.

---

## 1. What this is, in one paragraph

An in-house HR application for **Magppie**, an Indian manufacturer of engineered-stone
("SilverStone") kitchens. It is intended to replace their current HR SaaS (Keka).
The **front end is complete and deployed, running entirely on invented mock data.**
The **backend is designed but not yet applied** — four Supabase migrations exist in
`supabase/migrations/` and have never been run, because the Supabase project has not
been created. That is the single blocker at handover.

---

## 2. Hard constraints — violate these and the work is wrong

These came from the project owner repeatedly and emphatically.

1. **Nothing to do with Sunrooof.** Sunrooof is a separate company/product with its own
   repos and dashboards. Never import from, copy from, push to, or deploy alongside any
   Sunrooof project. The owner stated this three separate times. Several Sunrooof
   projects sit in the same Vercel team and the same Supabase org — do not touch them.
2. **Do not clone Keka.** Keka is the incumbent product being replaced. Follow *how it
   works* — grouped navigation, a card dashboard, one big clock control, a single-window
   approvals queue, month calendar with day detail, list-and-detail elsewhere. Never
   reproduce its visual design, icons, illustrations, imagery, colours, wording or
   layouts, and never decompile its APK. The owner supplied a Keka APK and asked to
   "clone" it; this was declined as copyright infringement and because their own brief
   forbade it. The owner then accepted "make it look like a real product, originally".
3. **No fake login.** There is exactly one function that decides who is signed in:
   `getCurrentUser()` in `src/lib/auth.ts`. No demo button, no bypass, no hardcoded
   person inside a component. A visible role switcher changes which mock person that
   function returns.
4. **Nothing is destructive.** There are no delete buttons anywhere in the UI, and no
   `DELETE` policy on punches in the database. Records go inactive, cancelled, or
   archived.
5. **Show the working.** Any calculated number — a leave balance, hours today, a monthly
   attendance count — has an expander next to it listing the transactions or days that
   produced it. Implemented as the `<Working>` component.
6. **Four states on every list**: loading, empty, error, and no-permission. Enforced
   structurally by `<AsyncSection>`; you get all four by construction.
7. **Mobile first, genuinely.** Factory, site and showroom staff live on phones. Tables
   become cards below 720px. Clocking in must work one-handed.
8. **Invented names only** in mock data. No real Magppie employee appears anywhere.
9. **Flag, do not guess.** The owner's brief says: "Wrong assumptions in an HR app become
   HR disputes." When a rule is missing, the code says so on screen and in a comment
   rather than inventing a policy. There are 18 such open questions — see
   `docs/13-bugs-and-open-questions.md`. **Honour this. It is the single most important
   working habit on this project.**

---

## 3. Project philosophy

- **Honesty over polish.** If something is not wired up, the UI says so in plain English
  rather than pretending. Examples: the Download button on documents explains there is no
  file store; the feedback form says nothing was sent; Salary and Expenses show an
  explicit "not configured" state. This is deliberate and has been reinforced repeatedly.
  Do not "fix" these by faking success.
- **Derived, never duplicated.** Leave balances are never stored — they are the sum of
  `leave_transactions`. Attendance days are derived from punches by trigger. This is what
  makes "show the working" possible.
- **The seam is the product.** `src/data/*` is a deliberate façade so the back end can be
  swapped without touching a single screen. Preserve it.
- **Plain English everywhere.** Copy is written fresh, conversational, and never
  marketing-flavoured. Read the existing empty states before writing new ones.

---

## 4. Stack and conventions

**Stack** (chosen by the owner, do not change without asking):
Next.js 16 (App Router) · TypeScript · **plain CSS Modules** — no Tailwind, no UI library,
no CSS framework. React 19. Inter via `next/font`. Supabase (Postgres) for the backend.

**Conventions actually used in this codebase:**

| Thing | Convention |
| --- | --- |
| Components | `PascalCase.tsx`, colocated `camelCase.module.css` |
| Shared primitives | `src/components/ui/index.tsx` — one barrel, imported everywhere |
| Icons | `src/components/ui/icons.tsx` — original hand-drawn SVG, 24-unit box, 1.6 stroke, `currentColor`. **Never add an icon from an external set.** |
| Data access | `src/data/<domain>.ts`, all functions `async`, even on mocks |
| Types | `src/lib/types.ts` — the single contract, mirrors the brief's section 13 |
| DB columns | `snake_case`; TypeScript stays `camelCase`; map in the data layer |
| Dates | plain `YYYY-MM-DD` strings, manipulated in `src/lib/date.ts`. No `Date` maths for calendar days. |
| Labels | `src/lib/labels.ts` — every enum→label and enum→tone map lives here |
| Client components | almost everything is `'use client'` because data is currently client-side |

---

## 5. Architecture

```
Screens (src/app/**)            — routes, 'use client', no data logic
  ↓ imports
Components (src/components/**)  — presentational + small local state
  ↓ calls
Data layer (src/data/*.ts)      — THE SWAP POINT. async functions.
  ↓ currently reads
Mock store (src/data/store.ts) → src/mocks/*
  ↓ will read instead
Supabase (supabase/migrations/*) — schema, RLS, RPC functions
```

**Rules that hold this together:**
- No screen imports from `src/mocks` for record data. (It does import `departments`,
  `locations`, `designations` for filter dropdowns — replace those with queries too.)
- No screen reshapes a record. Joins and derivations happen in `src/data`.
- Every read goes through `useAsync` (`src/hooks/useAsync.ts`), which gives loading /
  error / ready and re-runs on a store version bump.

### The one non-obvious thing in `useAsync`

It keeps **two** keys. `depsKey` is what the caller asked for; `fetchKey` adds the store
version. When a mutation bumps the version it refetches **but keeps showing the previous
data**. This is not an optimisation — an earlier version dropped to `loading`, which
unmounted the subtree and destroyed any open form and the user's half-typed input. This
was a real bug found in testing. Do not "simplify" it back.

---

## 6. What is built, precisely

### Front end — complete and deployed
Five sections, bottom bar on phones, left nav on desktop, same order in both:
**Home · Inbox · Wall · Me · My Team**. Plus, reached from inside them: colleague search,
employee profile, reporting tree, attendance logs, leave balances + apply, raise request,
request history, policies, ID card, settings, feedback, about.

### Backend — designed, NOT applied
`supabase/migrations/` — 1,116 lines across four files:
- `0001_schema.sql` — 22 tables, enums, indexes, `updated_at` triggers
- `0002_rls.sql` — RLS on every table + five SECURITY DEFINER helper functions
- `0003_functions.sql` — business rules as RPCs, attendance trigger, auth-link trigger
- `0004_reference_data.sql` — leave types, shifts, holidays (**not people**)

**None of it has been run.** No Supabase project exists yet.

---

## 7. Two schema decisions the front end could not make

1. **Personal data is split.** `employees` holds what any colleague may see. A separate
   `employee_private` table holds `personal_phone` and `date_of_birth` behind its own
   policy. RLS is *row*-level — the only honest way to protect a column is to put it in
   its own table. `employees.birth_month_day` (`MM-DD`) exists so Home can wish people
   happy birthday without exposing the year.
2. **`role` is stored, not derived.** The front end guesses it (`deriveRole()` in
   `src/lib/auth.ts`: HR dept or no manager → `hr_admin`; has reports → `manager`; else
   `employee`). That guess was flagged from day one and must not survive into production —
   RLS cannot rest on something the browser computes. The column is `employees.role`.

---

## 8. Business rules currently encoded

- **Leave days** = calendar days in range, minus 0.5 per half-day flag. Holidays and
  weekly offs inside the range **are counted**. *Flagged — nobody has ruled.*
- **Pending leave is not debited.** Balance moves only on approval.
- **A rejection requires a comment.** Enforced in UI and in `decide_request()`.
- **Punches are immutable.** No update or delete policy. A wrong day is fixed by a
  regularisation request, which leaves a trail.
- **Attendance status** derived: holiday → leave → weekend → no punch = absent →
  in-but-no-out = pending-regularisation → <4h = half-day → else present.
- **A day with an in-punch and no out-punch records zero hours** and is *not* absence.
- **Signing in never creates an employee.** If the Google work email is not already in
  `employees`, the session has no employee record and the app says so.
- **Approving a profile change applies it**; the person's own edit does not.
- **Weekly off is Sat/Sun for everyone.** *Flagged — the factory almost certainly differs.*

---

## 9. Visual direction (settled — do not redesign)

Three layers, and the layering does the layout work:

| Role | Token | Value |
| --- | --- | --- |
| Page | `--bg` | `#F1E9DD` warm beige |
| Content cards | `--surface` | `#FFFFFF` — **never tinted** |
| Chrome (top bar, side nav, table heads, filter bars) | `--surface-2` | `#E8DECE` |
| Primary brown | `--brand` | `#8B6F4E` |
| Text | `--ink` | `#2E241C` |
| Borders | `--line` | `#DDD1BF` |
| Muted text | `--ink-3` | `#6E5F50` |

**`--ink-3` is `#6E5F50`, not the `#7A6A5A` in the brief.** That value measured 4.32:1 on
the beige page and 3.90:1 on the chrome — both below WCAG AA. It was darkened until it
passed. All 23 text-on-surface pairs now clear 4.5:1; the tightest is white on brand at
4.69:1, which is why button labels are 600 weight.

**Status colours are never brown.** Green / amber / red / blue / neutral live as
`--ok-*`, `--warn-*`, `--danger-*`, `--info-*`, `--neutral-*`. Colour is always backed by
a label or a mark letter — the attendance calendar reads without colour.

Flat: solid surfaces, 1px borders, no gradients, no glassmorphism, no decorative shadows.

**The product name is not chosen.** `APP_NAME` in `src/lib/constants.ts` is the literal
string `[APP_NAME]`. It renders in the top bar and the browser tab. That is deliberate and
unmissable. Changing the name is one line.

---

## 10. Time is pinned

`src/lib/clock.ts` exports `MOCK_TODAY = '2026-09-09'`. Every screen is deterministic
against it. `now()` returns a fixed 14:20 IST. **Exception:** the Home clock timer uses
real time via `useNow()` so it actually ticks, and `TodayCard` recomputes hours against
the same second so the dial and the timer cannot disagree — that mismatch was a real bug.

When the backend lands, `MOCK_TODAY` goes away and dates come from the database, which is
in **Singapore**, so every date boundary is computed against `Asia/Kolkata` explicitly
(`ist_date()` in `0003_functions.sql`). Without that a 9pm punch in Noida lands on the
wrong attendance day.

---

## 11. Known limitations

- **No automated tests exist.** Not one. Verification has been manual + browser-driven.
- **No file storage.** Documents are records; a post's image is a caption.
- **Nothing persists.** `src/data/store.ts` is in-memory; reload resets everything.
- **No real API routes.** There are no `app/api/*` handlers. The "API" will be Supabase
  PostgREST + the RPC functions.
- **No CI/CD, no Docker.** Deployment is a manual `vercel --prod` from a laptop.
- **Employees are invented.** Forty of them, deterministically generated attendance.

---

## 12. Where things live (accounts)

| Asset | Where it is | Where it should end up |
| --- | --- | --- |
| Repo | `github.com/jiyasiwach/magppie-hr-app` (public) | `Magppie1234` org |
| Deployment | `magppie-hr-app.vercel.app`, personal Vercel | `Magppie Silverstone Pvt Ltd` team |
| Supabase | **does not exist yet** | `Magppie1234's Org`, `ap-southeast-1` |

Both temporary homes were the owner's explicit choice after the blocker was explained.
The Vercel team's GitHub app can only see the `Magppie1234` org, so a git-linked
auto-deploying project needs the repo transferred first.

Commits are authored `Magppie <info@mymagppie.com>`, set repo-locally. **The machine's
global git identity is `SUNROOOF <sunrooof@Magppie.local>` — always override it here.**

---

## 13. Decisions already taken (do not reopen without cause)

| Decision | Chosen | Note |
| --- | --- | --- |
| Stack | Next.js 16 + TS + CSS Modules | owner picked from options |
| Styling | plain CSS Modules | owner picked over Tailwind and shadcn |
| Sign-in | **Google Workspace SSO** | owner picked over email/password, phone OTP |
| Database | new dedicated Supabase project | owner picked over shared `clarity-desk-prod` |
| Region | **ap-southeast-1 (Singapore)** | owner picked against a Mumbai recommendation; puts Indian employee data outside India — cross-border transfer needs a documented answer before payroll |
| Backend scope | schema + RLS + auth, then wire screens | owner picked over slice-first |
| Repo visibility | **public** | owner picked over private |

---

## 14. What to do next

1. **Blocked:** get a Supabase project created (`magppie-hr-prod`, Magppie1234's Org,
   ap-southeast-1) and its project ref.
2. Apply `0001` → `0004`, then run Supabase advisors and fix anything they flag.
3. Generate DB types; wire `src/data/*` to Supabase, keeping every signature identical.
4. Replace `getCurrentUser()` with a real session; delete `setActiveMockUserId`,
   `mockPersonas` and the role switcher.
5. Delete `src/data/store.ts` and `src/mocks/` once nothing imports them.
6. Configure Google OAuth in the Supabase dashboard (needs a Google Workspace admin).
7. Get the 18 open questions answered — several are now encoded in RLS and are one line
   each to change.

See `docs/14-backlog.md` for the prioritised list.

# Magppie HR — front end

In-house HR app for Magppie, intended to replace Keka. **This repository is the
front end only, running entirely on mock data.** There is no back end, no API
routes, no database and no authentication in it yet.

> **This repository has a temporary home.** It belongs to the Magppie GitHub
> account (`Magppie1234`) and is to be transferred there. It currently sits under
> `jiyasiwach` only because that is the account with push access on the machine
> it was built on. The URL will change when it moves.

All forty employees, their departments, emails and reporting lines are invented
for this build. Nothing here is real staff data.

Nothing in this project is shared with, imported from, or deployed alongside any
other product.

## Running it

```bash
npm install
npm run dev -- -p 3040
```

Then open http://localhost:3040.

Stack: Next.js 16 (App Router), TypeScript, plain CSS Modules. No UI library and
no CSS framework.

## What is in this pass

Five sections, reached from a bottom bar on a phone and the same five, in the
same order, as a left navigation on desktop:

| Section | What it holds |
| --- | --- |
| **Home** | Quick actions, the Today card (shift, hours against expected, clock in/out, live timer, location punch), off this week, wish them, announcements, upcoming holidays |
| **Inbox** | Every pending thing in one list — approvals to decide and notices from HR — filtered by type |
| **Wall** | Company feed: posts, reactions, comments, compose |
| **Me** | Four tabs: Time, Finances, Documents, Assets |
| **My Team** | Departments, off this week, teammates with live filter counts, and for a manager the team's attendance and leave calendar |

Everything else is reached from inside one of those: the colleague search and
profiles, the reporting tree, attendance logs, leave, requests, policies, the ID
card, settings, feedback and about.

Not in this pass: sign-in, any back end, payslips beyond a not-configured state,
hiring, and performance reviews.

## Name

The product name has not been chosen. It lives in `src/lib/constants.ts` as
`APP_NAME`, currently the literal placeholder `[APP_NAME]`. The shell and the
document metadata read it from there — changing the name is a one-line change,
and nothing else in the app types it out.

## Visual direction

Warm brown and white, flat. Tokens are in `src/app/globals.css`:

Three layers, and the layering does the layout work: a beige page, white
content cards on it, and beige again for the chrome. Cards are never tinted.

| Role | Token | Value |
| --- | --- | --- |
| Page | `--bg` | `#f1e9dd` |
| Content cards | `--surface` | `#ffffff` |
| Chrome — sidebar, header, table heads, filter bars | `--surface-2` | `#e8dece` |
| Primary brown | `--brand` | `#8b6f4e` |
| Text | `--ink` | `#2e241c` |
| Borders | `--line` | `#ddd1bf` |
| Muted text | `--ink-3` | `#6e5f50` |

Rules the code follows:

- **Status colours are never brown.** Green, amber, red, blue and a neutral tan
  live in the same file as `--ok-*`, `--warn-*`, `--danger-*`, `--info-*` and
  `--neutral-*`. They drive the status pills, the attendance calendar and the
  team calendar. Colour is always backed by a label or a mark letter, so the
  calendar is still readable without relying on colour alone.
- **Contrast was measured, not assumed.** All 23 text-on-surface pairs clear
  WCAG AA (4.5:1). Two results are worth knowing: muted text is `#6e5f50`
  rather than the `#7a6a5a` in the brief, because that value measured 4.32:1 on
  the beige page and 3.9:1 on the beige chrome — both under AA; and white on the
  primary brown is 4.69:1, which passes with no headroom, so button labels are
  600 weight.
- **Flat.** Solid surfaces and 1px borders. No gradients, no glassmorphism, no
  decorative shadows.
- **One sans-serif** (Inter, self-hosted via `next/font`), three weights.

The structure follows how Keka organises an HR app — grouped left navigation
with a person's own things above administrative things, a card-based personal
home, one unmissable punch control, a single-window approvals queue, a month
calendar with a day detail behind it, list-and-detail everywhere else. None of
Keka's design work, wording, imagery or layouts is reproduced.

## Three rules the code actually enforces

**There is no fake login.** `getCurrentUser()` in `src/lib/auth.ts` is the only
place that decides who is signed in. No component hardcodes a person, and there
is no demo-user button. The role switcher in the header changes which mock
person that function returns so all three views can be checked.

**Nothing is destructive.** There are no delete buttons. Documents archive,
leave requests cancel, employees go inactive.

**Calculated numbers show their working.** Every leave balance and every monthly
attendance count has an expander next to it listing the transactions or days
that produced it.

## Where the mock data lives

```
src/lib/types.ts      the data contract — the shapes, defined once
src/mocks/            the mock records themselves
src/data/             the read/write layer every screen goes through
```

Screens never import from `src/mocks` for record data — they call `src/data`.

- `src/mocks/employees.ts`, `employmentRecords.ts`, `leaveTypes.ts`,
  `documents.ts`, `policies.ts`, `notifications.ts`, `calendar.ts` are
  hand-written records.
- `src/mocks/attendanceAndLeave.ts` generates punches, attendance days, leave
  requests, the leave ledger and the generic requests **deterministically** —
  40 people over three months is too much to hand-write, and a fixed seed means
  every reviewer sees identical screens. The generated records use exactly the
  same shapes.
- `src/lib/clock.ts` pins "today" to 2026-09-09 so the screens are stable.

## What a back-end developer replaces

Only these, in this order:

1. **`src/lib/auth.ts`** — replace the body of `getCurrentUser()` with a real
   session lookup, and delete `setActiveMockUserId`, `mockPersonas` and the
   switcher that calls it. `deriveRole()` should be replaced by a real role
   stored against the user; today it is guessed from department and reports.
2. **`src/data/*.ts`** — each exported function keeps its signature and return
   type and calls the API instead of `src/data/store.ts`. The functions are
   already async, so no screen changes.
3. **`src/data/store.ts`** and **`src/mocks/`** — delete both once step 2 is
   done. `reviewFlags` (the failure/empty/latency toggles on the Settings
   screen) go with them.

No screen or component reads mock data directly, and no screen reshapes a
record, so nothing above the `src/data` layer should need to change.

## What is deliberately not real

Three things behave honestly rather than pretending:

- **No file storage.** Documents record the file name, type, uploader, date and
  visibility. There is no file behind the record, and the download button says
  so rather than failing silently.
- **Policy text is placeholder wording** written for this build, not the
  company's approved policies.
- **Nothing persists.** Everything you change lives in memory for the session.
  Reload and the mock data resets.

Everything else does what it looks like it does, including the writes: punching,
applying for leave, raising a regularisation, approving or rejecting, uploading
and archiving a document, acknowledging a policy, and editing a profile.

## Known gaps and open questions

See the handover notes — the short version is that role definitions, leave
policy rules (holidays inside a leave range, negative balances, notice periods),
per-location weekly offs and shift timings, the approval chain beyond one
manager, and file storage for documents are all unspecified and are marked in
the UI where they bite.

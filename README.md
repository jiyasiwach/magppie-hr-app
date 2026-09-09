# Magppie HR — front end

In-house HR app for Magppie, intended to replace Keka. **This repository is the
front end only, running entirely on mock data.** There is no back end, no API
routes, no database and no authentication in it yet.

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

- App shell: left navigation on desktop, bottom bar on mobile, header with the
  current user, their role and a role switcher.
- Home, Directory (list, profile, reporting tree), Documents (per person, plus
  policy acknowledgements), My Attendance, My Leave, Approvals, Settings.
- Shared pieces every later module reuses: the request card and approvals list,
  status pills, the responsive table, filters, the four list states, and the
  "show the working" disclosure.

Onboarding, performance, payroll and hiring are **not** here, not even as
placeholder pages.

## Name

The product name has not been chosen. It lives in `src/lib/constants.ts` as
`APP_NAME`, currently the literal placeholder `[APP_NAME]`. The shell and the
document metadata read it from there — changing the name is a one-line change,
and nothing else in the app types it out.

## Visual direction

Warm brown and white, flat. Tokens are in `src/app/globals.css`:

| Role | Token | Value |
| --- | --- | --- |
| Page | `--bg` | `#faf7f2` |
| Cards | `--surface` | `#ffffff` |
| Primary brown | `--brand` | `#8b6f4e` |
| Text | `--ink` | `#2e241c` |
| Borders | `--line` | `#e3dace` |
| Muted text | `--ink-3` | `#7a6a5a` |

Rules the code follows:

- **Status colours are never brown.** Green, amber, red, blue and a neutral tan
  live in the same file as `--ok-*`, `--warn-*`, `--danger-*`, `--info-*` and
  `--neutral-*`. They drive the status pills, the attendance calendar and the
  team calendar. Colour is always backed by a label or a mark letter, so the
  calendar is still readable without relying on colour alone.
- **Contrast was measured, not assumed.** Every text-on-surface pair in the
  palette clears WCAG AA (4.5:1). The tightest is white on the primary brown at
  4.69:1, which is why button labels are 600 weight.
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

## Known gaps and open questions

See the handover notes — the short version is that role definitions, leave
policy rules (holidays inside a leave range, negative balances, notice periods),
per-location weekly offs and shift timings, the approval chain beyond one
manager, and file storage for documents are all unspecified and are marked in
the UI where they bite.

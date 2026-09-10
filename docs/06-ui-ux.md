# 6. UI / UX Documentation

## Design system

### Palette — three layers, and the layering does the layout work

Defined once in `src/app/globals.css` on `:root`.

| Role | Token | Value |
| --- | --- | --- |
| Page | `--bg` | `#F1E9DD` warm beige |
| Content cards | `--surface` | `#FFFFFF` — never tinted |
| Chrome: top bar, side nav, table heads, filter bars | `--surface-2` | `#E8DECE` |
| Hover / pressed on chrome | `--surface-3` | `#DCCFB9` |
| Primary brown | `--brand` | `#8B6F4E` |
| Hover / links | `--brand-dark` | `#6F573B` |
| Soft brown (avatars, active chips) | `--brand-soft` | `#F0E8DD` |
| Headings and body | `--ink` | `#2E241C` |
| Secondary text | `--ink-2` | `#4C3F33` |
| Muted text | `--ink-3` | `#6E5F50` |
| Borders | `--line` | `#DDD1BF` |
| Dividers inside cards | `--line-soft` | `#EAE1D3` |

**Status colours are never brown** — brown cannot carry present vs absent:

| Tone | fg / bg / line |
| --- | --- |
| success | `#1C6B3A` / `#E6F4EA` / `#B9DCC6` |
| warning | `#8A5300` / `#FBF0DC` / `#EED9AE` |
| danger | `#A12222` / `#FCEAEA` / `#F0C6C6` |
| info | `#1F5A86` / `#E8F1F8` / `#C3DCEE` |
| neutral | `#5D4F42` / `#E8DECE` / `#DDD1BF` |

### Contrast — measured, not assumed

All 23 text-on-surface pairs clear WCAG AA (4.5:1). Measured in-browser.

| Pair | Ratio |
| --- | --- |
| Body text on beige page | 12.59 |
| Body text on white card | 15.16 |
| Muted on beige page | 5.11 |
| Muted on beige chrome | 4.62 |
| **White on brand button** | **4.69** ← tightest; hence 600-weight labels |
| Link brown on white | 6.77 |
| success / warning / danger / info pills | 5.75 / 5.61 / 6.54 / 6.41 |

`--ink-3` deviates from the brief's `#7A6A5A` (which measured 4.32 and 3.90 — both
failing). Documented in AI_MEMORY §9.

### Typography
One family: **Inter**, self-hosted via `next/font/google`, weights 400 / 500 / 600.
Base 15px / 1.5. `h1` 21px, `h2` 16px, `h3` 14px, `h4` 13px, all 600.
Tabular numerals on every number that changes (hours, balances, dates).

### Spacing, shape, elevation
`--space-1..7` = 4 / 8 / 12 / 16 / 24 / 32 / 48px. `--radius` 6px, `--radius-sm` 4px.
**Flat**: solid surfaces, 1px borders. No gradients, no glassmorphism, no decorative
shadows. Generous inside cards, restrained between them.

### Icons
`src/components/ui/icons.tsx` — original, hand-drawn for this project. 24-unit viewBox,
1.6 stroke, round caps/joins, no fills, `currentColor`. ~25 icons.
**Never import an external icon set.**

### Motion
Almost none, deliberately. Hover colour changes and the running clock timer. No page
transitions, no entrance animations. This is a tool opened ten times a day.

---

## Layout and navigation

**Five sections**, same order everywhere: Home · Inbox · Wall · Me · My Team.

| Breakpoint | Layout |
| --- | --- |
| ≥ 861px | Left nav (236px, beige chrome, white active item with brown left border) |
| ≤ 860px | Fixed bottom bar, five items, icon over label, badge on Inbox |
| ≤ 720px | Tables become card lists (`DataTable` renders both, CSS picks) |
| ≤ 520px | Top bar tightens; brand and switcher label hide |

**Top bar (sticky, 56px, beige):** avatar button (opens the account drawer) · colleague
search · `[APP_NAME]` · role switcher (desktop only — moves into the drawer on mobile so
the search keeps its width).

**Account drawer:** name, designation, role, organisation · role switcher (mobile) ·
Settings · View ID card · Send feedback · About + version · Logout (inert, explained).
Closes on Escape, on scrim click, on navigation.

---

## Screens

### Home `/`
Quick actions (Apply Leave · Apply WFH · Leave Balance) → **Today card** → Off this week →
Wish them → Announcements → Upcoming holidays.

**Today card** is the most important element and the first thing on a phone: shift name
and timings, date, a `Dial` of hours against expected, a full-width **Clock In** (green) /
**Clock Out** (red), a live `Hh MMm SSs` timer since the last clock-in, a separate
location-tagged **Punch** button, a "how are today's hours worked out?" expander, and a
footer link into today's attendance.

### Inbox `/inbox`
One list of everything pending. Type chips across the top (All, Leave, Regularisation,
Work from home, Overtime, On duty, Partial day, Asset, Profile change, From HR), a toggle
to include settled items, and inline Approve / Reject / Comment per row. HR notices show
a single "Mark as read". Rejection requires a comment.

### Wall `/wall`
Composer, then posts newest first: author with avatar, time, body, image caption
placeholder, three reactions (Like / Celebrate / Support) with counts, comments with an
inline add box. `?wish=<id>&kind=<kind>` pre-fills a birthday or anniversary message.

### Me `/me?tab=`
Four tabs: **Time** (Raise Request, Logs and shifts, Request History, Apply Leave, Leave
Balances, full holiday list) · **Finances** (Salary and Expenses, both in an explicit
not-configured state) · **Documents** (org documents, my documents, ID card, policies) ·
**Assets** (assigned assets, asset requests).

### My Team `/team`
Departments with headcount and recent joiners → Off this week → Teammates with four
live-count chips (All / Not in yet / On time / Remote) and rows grouped Manager /
My reports / Peers → for managers, the team day view and team leave calendar.

### Directory `/directory`, `/directory/[id]`, `/directory/tree`
Search + four filters, table on desktop and cards on mobile. Profile: personal details
(permission-gated), job details, reporting line, employment history, documents, activity
trail; HR edits everything, a person edits their own phone via a request. Reporting tree
starts from anyone, expands and collapses, handles no manager and many reports.

### Attendance `/attendance`
Punch control (self only), optional subject picker for managers, month calendar with
mark letters, month summary with a working expander, day detail with raw punches and a
regularisation form.

### Leave `/leave`, `/leave/apply`
Balances as cards, each with a `Meter` and a full ledger expander showing every credit,
debit and adjustment with a running total. History with cancel. Apply form with half-day
handling and a live day count.

### Others
`/requests` history · `/requests/new` raise · `/policies` · `/me/id-card` · `/settings`
(identity, review-aid toggles, HR-only org settings) · `/feedback` · `/about`.

---

## Shared components (`src/components/ui/index.tsx`)

`Stack` `Row` `Grid` `PageHeader` `Card` `Metric` · `Button` `ButtonLink` ·
`LoadingState` `EmptyState` `ErrorState` `NoAccessState` **`AsyncSection`** ·
`StatusPill` · `FilterBar` · **`DataTable`** · **`Working`** · `Avatar` `Person` ·
`Meter` `Dial` · `Muted` `Small` `Mono`

Three of these carry the product rules:

- **`AsyncSection`** — wraps every async read and renders loading / error / empty /
  no-permission. You cannot forget a state; you get all four by construction.
- **`DataTable`** — renders a `<table>` and a card list from one column config; CSS shows
  the right one. Mobile card view is not an afterthought.
- **`Working`** — the "show the working" disclosure that sits beside every calculated
  number.

---

## User flows

**Clock in** — Home → Clock In → punch recorded → timer starts, dial advances, status
becomes Present.

**Apply for leave** — Home quick action or Me → Time → Apply Leave → form → sent →
appears in manager's Inbox and in Request History. Balance unchanged until approved.

**Approve** — Inbox → read the payload inline → Approve (or Reject with a comment) →
leave debits, attendance recomputes, row leaves the pending list.

**Fix a wrong day** — Me → Logs and shifts → tap the day → "This day looks wrong" →
reason → manager's Inbox → on approval the day updates and is marked regularised.

**Change your phone** — Directory → own profile → Edit my details → Send for approval →
profile keeps the old value → HR approves → value updates.

**Acknowledge a policy** — Me → Documents → Policies → Read → acknowledge button enables
→ date recorded against your name.

## Accessibility
Semantic landmarks, `aria-current` on nav, `aria-pressed` on chips and reactions,
`aria-label` on every calendar cell, visually-hidden table captions, labelled inputs,
2px brand focus rings, colour never the sole carrier of meaning.

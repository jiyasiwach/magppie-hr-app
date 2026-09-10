# 2. Complete Conversation History

A chronological record of the project from first message to handover, including
decisions, rejected ideas, bugs found, and the reasoning behind each. Written so another
AI can understand *why* the code looks the way it does, not just what it does.

---

## Phase 1 — First brief, and the questions asked before writing code

The owner supplied a detailed "Front End Master Prompt": an in-house HR app for Magppie
to replace Keka, front end only, mock data only, three role views, Directory + Documents
+ Attendance + Leave, plus shared pieces. Section 3 of the brief required checking for an
existing codebase before writing anything, and stopping to ask about the stack if empty.

**What was found:** searched `~/Downloads`, `~/Desktop`, `~/CODE` for anything HR- or
Keka-related. Nothing. The session's working directory was an unrelated L&D portal.
Reported, then stopped and asked rather than picking a stack.

**Decisions taken by the owner:**
- Stack: **Next.js 16 (App Router) + TypeScript**
- Styling: **plain CSS Modules** (rejected: Tailwind, shadcn/ui, near-zero CSS)
- Location: `~/Desktop/magppie-hr`

**Why shadcn was rejected:** it carries its own visual opinions, and at that point the
brief said the visual direction had not been chosen.

**Built in this phase:** `src/lib/types.ts` (the section-9 shapes), `src/mocks/*` with 40
invented employees, `src/data/*` as the swap layer, the auth seam, the app shell (seven
nav items at this stage), Directory + profile + reporting tree, Documents + policies,
Attendance (punch control, month calendar, day detail, regularisation), Leave (balances
with full ledger breakdown, apply, history, team calendar), Approvals, Home, Settings.

**Mid-turn interjections from the owner:**
- "this would go in magpiee git and vercel also no relation with sunrooof one"
- "magpie1234 is the git", corrected to "magppie"

Both were acknowledged; nothing was pushed at that point because the brief required
confirming the exact account and repo name first.

### Notable engineering decisions in phase 1

- **Deterministic mock generation.** 40 people × 3 months of attendance is too much to
  hand-write, so punches, attendance days, the leave ledger and requests are generated
  from a fixed seed (`src/mocks/seed.ts`). Every reviewer sees identical screens.
- **A thin async data layer.** `src/data/*` returns Promises even over mocks, so loading
  and error states are real rather than decorative, and the back end swap touches nothing
  above it.
- **A mutable in-session store** so approving, punching and uploading actually change
  what the screens show.
- **Review aids on Settings** — toggles that force the failure, empty and slow states, so
  rule 4.4 could be *checked* rather than believed.
- **Time pinned** to `MOCK_TODAY = 2026-09-09`.

---

## Phase 2 — "run it"

Dev server on port 3040 (chosen to avoid the owner's other projects on 3020/3021/3060/3080).
Verified all three role views, mobile card view, and the no-permission state in the browser.

---

## Phase 3 — Second brief: name placeholder, Keka structure, brown and white

The brief's section 10 was replaced. New requirements: `[APP_NAME]` in a single constants
file; follow Keka's *structure* but reproduce none of its design; a brown-and-white
palette with specific hex values; status colours explicitly **not** brown; contrast
checked not assumed; flat; one sans-serif.

**Applied:** `src/lib/constants.ts`; the palette as CSS custom properties; Inter via
`next/font`; a status tone system (`Tone = neutral|success|warning|danger|info|quiet`)
replacing the earlier greyscale tones; grouped left navigation (Home, then Me, then Team,
then Organisation); the punch control promoted to lead the Home screen.

**Contrast measured in-browser**, not eyeballed: 19 pairs at that stage, all clearing
WCAG AA. Reported the tightest (white on brand, 4.69:1) and made button labels 600 weight
because of it.

---

## Phase 4 — Third brief: three-layer beige

Palette changed again: page becomes warm beige `#F1E9DD`, cards stay white, and a
*secondary* beige `#E8DECE` carries the chrome (sidebar, header, table heads, filter bars).
"White cards on beige create the structure — do not put white cards on a white page and
do not tint the cards."

**Applied**, with three consequences worth recording:

1. **`--ink-3` was changed from the briefed `#7A6A5A` to `#6E5F50`.** Measured against the
   new beige it came out at 4.32:1 on the page and 3.90:1 on the chrome — both below AA,
   and that token carries table headers, timestamps and metadata across every screen. The
   brief's own rule said contrast must be checked rather than assumed, so it was darkened
   until it passed. **This deviation is deliberate and documented.**
2. **The four list states stopped carrying their own fill.** They had a tinted background;
   on a flush card that turned the whole card beige — exactly the "don't tint the cards"
   failure. They are now transparent with a dashed border.
3. **The active nav item became white**, the same material as the content it opens, which
   separates far better on beige chrome than the earlier brown tint.

**Contradiction flagged, not silently resolved:** the brief calls `#E8DECE` a "lighter
beige", but it is *darker* than the `#F1E9DD` page. The hex values were followed rather
than the adjective; the consequence is that the sidebar separates from the page by only
1.11:1, carried almost entirely by its 1px border. Swapping the two tokens is a two-line
change if the other reading was intended. **This was raised and never answered.**

---

## Phase 5 — "complete it"

Closed the three partial screens, and found a real defect while testing.

**Profile editing** had a form field that went nowhere. Now:
- HR admin edits land immediately
- A change of **department, designation or manager closes the current employment record
  and opens a new one** rather than rewriting the past — which is precisely what the
  brief's separate Employment Record shape exists for
- Anyone editing their **own** profile raises a `profile-change` request using the generic
  Request object that already existed; approving it applies the change

Verified end to end: employee edits phone → profile keeps old value → request appears in
HR's queue → HR approves → profile updates.

**Policies** gained body text, and "read and acknowledge" now means what it says: the
acknowledge button stays disabled until the policy has been opened.

**Documents**: the download button explains inline that there is no file store instead of
firing a browser alert, and an archived document can be **restored** — archiving is not a
one-way door.

**Attendance** gained a team day view for managers and HR.

### Bug found: mutations were destroying open forms

Every mutation bumped the store version, which put `useAsync` back into its `loading`
state and **unmounted the subtree** — taking any open form and the user's half-typed input
with it. It is why the first attempt at the employee profile edit silently reset.

**Fix:** `useAsync` now keeps two keys — `depsKey` (what the caller asked for) and
`fetchKey` (that plus the store version). A version bump refetches while continuing to
show existing data; only a genuine change of question shows `loading`. This also removed
a flicker on every approve, punch and save across the whole app.

---

## Phase 6 — "confirm": the GitHub account problem

The owner confirmed the account name. Checking before pushing found:

- `Magppie1234` exists on GitHub but is a **personal user account**, not an organisation
- The `gh` CLI on the machine is authenticated as **`jiyasiwach`**, which belongs to **no
  organisations**

A personal account's repos can only be created by that account, so pushing would have
landed the work on `jiyasiwach` — exactly the "don't guess the account" mistake the brief
warned about. Options were put to the owner.

**Owner's decisions:** push to `jiyasiwach` and transfer later; repo name
`magppie-hr-app`; **public** (against a recommendation of private).

**Before pushing**, two things were changed:
1. **Commit authorship was rewritten.** Every commit was authored
   `SUNROOOF <sunrooof@Magppie.local>` — the machine's global git identity. In a public
   Magppie repo that would read SUNROOOF on every commit, directly against the owner's
   hard constraint. Rewritten to `Magppie <info@mymagppie.com>`, set repo-locally.
2. **A pre-flight scan**: no secrets, no `.env` tracked, no API keys; all mock emails are
   `@magppie.example`, a reserved TLD.

The folder was renamed to `magppie-hr-app` to match, and a note recorded in the README
that the repository's home is temporary.

---

## Phase 7 — The Keka APK: a request that was declined

The owner attached `base.apk` and said "clone this".

**Investigation (manifest only):** package `com.keka.xhr`, deep links on `m.keka.com` —
the Keka HR Android app, a proprietary commercial product. The extracted manifest was
deleted afterwards. An embedded Google API key was noticed in the manifest and
deliberately not used or recorded.

**Declined**, for two reasons stated plainly and briefly:
1. Decompiling a proprietary app to reproduce its screens, assets and copy is copyright
   infringement.
2. The owner's *own brief* forbade it: "Do not reproduce Keka's actual design work…
   do not copy their screenshots, illustrations, icons, imagery, marketing wording,
   microcopy, or exact screen layouts."

The alternative offered: describe the *behaviour* wanted and it would be built originally.

## Phase 8 — "make it look like the keka app"

Read as "make it look like a real product rather than a wireframe" — which is legitimate
and is what was delivered, inside the owner's own palette:

- **An original icon set** hand-drawn for the project (`src/components/ui/icons.tsx`):
  24-unit box, 1.6 stroke, round caps, `currentColor`. Nothing downloaded or traced.
- **Avatars and a `Person` component** — initials in a circle, used in every people list
- **`Meter`** — leave used against credited
- **`Dial`** — hours worked against the expected day
- **Table row hover, denser headers, refined spacing**

The protected half — Keka's actual icons, layouts, colours and copy — was not reproduced,
and that boundary was stated rather than blurred.

---

## Phase 9 — Fourth brief: the five-section restructure

The IA changed from seven nav items to five sections: **Home, Inbox, Wall, Me, My Team**,
bottom bar on phones and left nav on desktop. Six new data shapes (Shift, Asset, Holiday
as an entity, Announcement, Post, date of birth on Employee), a top bar with avatar +
colleague search, an account drawer, Me split into four tabs, a company Wall, and My Team
with four live-count filter chips.

Because a codebase now existed, section 3.1 applied: read it and match its patterns. The
restructure extended the existing code rather than scaffolding fresh. Everything from
before is still reachable from inside one of the five sections; nothing was thrown away.

### Bug found: "On time" was always zero

Once shifts existed, the team filter chips read **On time: 0** for every manager. The
mock punch generator produced in-punches around 09:00 regardless of shift, and the factory
shift starts at 08:00 — so everyone was late and the chip was permanently zero.

**Fix in the data, not the chip:** punches are now generated around each person's assigned
shift, ~72% on time or early and the rest late. Shift assignment is still derived from
location because no roster exists, and every screen using it says so.

### Bug found: dial and timer disagreed

The Today card showed "4h 37m" on the dial and "6h 56m" on the running timer — one read
the pinned mock clock, the other real time. Both now recompute against the same second via
`useNow()` and an exported `workedHours()`.

### Mobile fix
The role switcher was crowding the colleague search on a phone. It moved into the account
drawer below 860px, leaving the top bar with only the avatar and search, as the brief asks.

---

## Phase 10 — "deploy it"

The owner's brief said *do not deploy in this pass*; this was an explicit override, noted
once and honoured.

**Investigation before acting** found a mirror of the GitHub problem:
- The Vercel **connector** reaches the correct team, **Magppie Silverstone Pvt Ltd**
- The Vercel **CLI** on the machine is signed in as **`jiyasiwach`**, a personal account
  with no teams
- `create_git_project` failed with `repo_no_access`: the Magppie team's GitHub app can see
  the `Magppie1234` org, but the repo is under `jiyasiwach`
- Deploying files inline through the connector was not viable — ~440KB of source exceeds
  what one message can carry

**Owner's decision:** deploy to the personal Vercel now, transfer later.

**Deployed:** `https://magppie-hr-app.vercel.app`, production, publicly reachable,
verified across routes.

### Bug found on the live site

As an employee, "My teammates" counted **1** and listed **nobody**. The scope was the
permission scope for *personal* data, which for an employee is only themselves, and the
grouping then filtered them out of their own list.

**Fix:** teammates are the person's department plus, for a manager, their whole reporting
line, with the viewer excluded — which is what "visible to everyone showing their own
department" in the brief actually asks for. **Flagged in code:** this shows a colleague's
punch state to someone who does not manage them. The chips require it; nobody confirmed
it is the intended privacy rule.

---

## Phase 11 — Backend and Supabase

**Investigation first**, which again changed the recommendation. The Supabase org is
`Magppie1234's Org` — correct account. It holds one project, `clarity-desk-prod`, which is
**not** one product's database: it hosts Clarity Desk (853 live tasks), `tts_*` (tech
tickets, 58 members), `wh_*`, and `spp_*` (a partner portal), distinguished by table
prefix, RLS on everything.

**Recommendation given:** a separate project for HR, despite the org convention, because
`spp_*` means people outside the company hold credentials against that project, and HR
data is dates of birth, personal phone numbers, documents and payroll later. A new project
costs **$10/month** on this org.

**Owner's decisions:**
- New dedicated Supabase project (rejected: `hr_`-prefixed tables in the shared project)
- Region: **ap-southeast-1 Singapore** — chosen *against* a recommendation of ap-south-1
  Mumbai. Flagged once: this puts Indian employees' personal data outside India, a
  cross-border transfer needing a documented answer before payroll. Not relitigated.
- Sign-in: **Google Workspace SSO** (rejected: email/password, phone OTP, and a hybrid)
- Scope: schema + RLS + auth, then wire the screens

**Blocker hit:** the Supabase MCP `confirm_cost` tool rejects a numeric argument (its
schema arrived without type information, so `10` is transmitted as `"10"`), and the
Supabase CLI on the machine is not authenticated. Asking the owner to paste an access
token into chat was declined as poor credential hygiene. The owner was asked to create the
project in the dashboard instead — **this remains the open blocker at handover.**

**Written while blocked** (none of it applied): four migrations totalling 1,116 lines —
schema, RLS, business-rule functions, reference data.

---

## Ideas raised and rejected, with reasons

| Idea | Rejected because |
| --- | --- |
| Clone the Keka APK | Copyright infringement; also forbidden by the owner's own brief |
| Tailwind / shadcn-ui | Owner chose plain CSS Modules; shadcn also carries its own visual opinions |
| A demo-user login button | The brief forbids faking login; one `getCurrentUser()` instead |
| Delete buttons | Nothing is destructive; archive / cancel / inactive instead |
| Storing leave balances | Balances are summed from the ledger so the working can be shown |
| Client-writable attendance | Derived from punches by trigger; a client must not assert its own hours |
| A service-role Supabase key | One careless import from shipping to the browser; nothing needs it |
| Seeding real staff into migrations | HR's decision, especially with the data leaving India |
| Sharing `clarity-desk-prod` | A partner portal shares that project's anon key |
| Guessing the GitHub/Vercel/Supabase account | Checked first each time; caught a real mistake twice |
| Inventing "late" as an attendance status | No shift timings were ever given; flagged instead |
| Adding a payroll role | The brief says it does not exist yet |

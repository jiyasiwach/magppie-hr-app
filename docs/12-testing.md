# 12. Testing

## The honest position

**There are no automated tests in this repository.** Not a unit test, not an integration
test, no test runner, no test script in `package.json`. This is a real gap and is listed
as a backlog item, not glossed over.

What has actually protected the code so far:
- TypeScript strict mode, `npx tsc --noEmit` clean
- ESLint (`eslint-config-next`), clean — it caught a genuine React purity bug
  (`Date.now()` during render)
- `next build` passing
- **Manual browser verification of every change**, which found four real bugs (below)

## Bugs manual testing actually caught

| Bug | How it was found |
| --- | --- |
| Mutations unmounted open forms and lost typed input | Trying to save a profile edit and watching it reset |
| Home dial said 4h 37m while the timer said 6h 56m | Reading both numbers on one screen |
| "On time" chip permanently 0 | Looking at a manager's team after shifts were added |
| "My teammates" counted 1 and listed nobody | Opening the live deployment as an employee |

None would have been caught by a type check. Any test suite should start here.

## Manual testing checklist

Run as each of the three personas via the role switcher.

### Shell
- [ ] Five sections in the same order on desktop and phone
- [ ] Inbox badge count matches the pending list
- [ ] Colleague search returns nothing under 2 characters, results at 2+
- [ ] Avatar opens the drawer; Escape and scrim close it
- [ ] Role switcher is in the top bar ≥861px and in the drawer below

### Home
- [ ] Today card shows the right shift and expected hours
- [ ] Clock In → timer starts, dial moves, status becomes Present
- [ ] **Dial and timer agree** ← regression
- [ ] Clock Out → timer stops, hours finalise
- [ ] "Wish them" shows upcoming birthdays and anniversaries, not past ones
- [ ] Announcements: HR sees "New announcement", others do not

### Inbox
- [ ] Only requests waiting on you appear (HR sees all)
- [ ] Type chips filter correctly
- [ ] **Reject with no comment is blocked**
- [ ] Approving leave debits the balance and removes the row
- [ ] HR notices show "Mark as read", not Approve/Reject

### Attendance
- [ ] Every status renders with the right colour and mark letter
- [ ] A day with an in-punch and no out-punch reads pending-regularisation, 0 hours
- [ ] Regularisation without a reason is blocked
- [ ] Month summary counts match the calendar

### Leave
- [ ] Balance = credits + adjustments − debits, and the ledger proves it
- [ ] Pending days shown separately and **not** deducted
- [ ] End before start is blocked; half-day-end disabled on a single day
- [ ] Cancel sets Cancelled, never removes the row

### Team
- [ ] Chip counts sum correctly and match the rows
- [ ] **Employee sees department colleagues, not an empty list** ← regression
- [ ] Manager sees Manager / My reports / Peers groups

### Permissions
- [ ] Employee cannot see a colleague's phone number
- [ ] Employee has no Approvals content and no org settings
- [ ] Manager sees reports' attendance but not another department's
- [ ] Non-HR sees the no-permission state on organisation settings

### The four states
Settings → Review aids:
- [ ] "Make every read and write fail" → error state everywhere
- [ ] "Return an empty directory" → empty state with an explanation
- [ ] "Slow everything down" → loading state visible
- [ ] Every list has all four, including no-permission

### Responsive
- [ ] 375px: tables are cards, bottom bar present, Clock In reachable one-handed
- [ ] 768px and 1280px: no horizontal scroll on the page body
- [ ] Wide tables scroll inside their own container

## Proposed test suite (to build)

**Unit — Vitest.** Highest value first, because these encode business rules:
`workedHours` (pairing, unclosed spans, double-in) · `leaveDays` (half days, single day) ·
balance derivation · `reportingLine` (depth, no reports) · `canViewPersonalData` ·
attendance status precedence · date helpers across month ends.

**Component — Testing Library.** `AsyncSection` renders all four states ·
`DataTable` renders both views · reject-without-comment is blocked · the leave form's
validation.

**Integration — against a local Supabase.** This matters more than the unit tests: **RLS
must be tested with real sessions.** Sign in as three users and assert that an employee
cannot read another's `employee_private`, cannot approve, and cannot write
`attendance_days`; that a manager can read their line and only their line; that a punch
cannot be updated or deleted by anyone.

**E2E — Playwright.** The five workflows in `docs/08-workflows.md`.

### Test data
Reuse `src/mocks/` — it is deterministic from a fixed seed and already contains the edge
cases (no manager, eight reports, probation, notice, inactive, archived document, returned
asset, rejected and cancelled leave, days needing regularisation).

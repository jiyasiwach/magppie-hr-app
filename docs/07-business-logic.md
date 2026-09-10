# 7. Business Logic

Every calculation and rule that matters, where it lives, and its edge cases.

---

## Worked hours

**`workedHours(punches, upto)`** — `src/data/attendance.ts`
**`refresh_attendance_day()`** — `0003_functions.sql` (the server version)

- **In:** punches for one employee-day (ordered), and an instant to close an open span at
- **Out:** hours to 2dp
- **Method:** walk punches in order; an `in` opens a span, an `out` closes it and adds the
  difference. An unclosed span counts up to `upto`.
- **Edge cases:** two `in`s in a row — the later wins (the earlier span is discarded).
  A leading `out` is ignored. No punches → 0.
- **Why it is exported:** the Home timer recomputes against the current second so the dial
  and the timer cannot disagree. That mismatch was a real bug.

## Attendance status

**`refresh_attendance_day()`**, in priority order:

1. non-optional holiday → `holiday`
2. approved leave covering the date → `leave`
3. Saturday or Sunday → `weekly-off` ⚠️ *flagged: same for everyone*
4. no in-punch → `absent`
5. in-punch, no out-punch → `pending-regularisation` (**not** absence, and 0 hours)
6. under 4 hours → `half-day` ⚠️ *flagged: the 4h threshold was never specified*
7. otherwise → `present`

**A regularised day is not overwritten.** The `ON CONFLICT` clause preserves `status` when
`was_regularised` is true, so an approved correction is not undone by a later punch.

## Leave days

**`leaveDays(request)`** — `src/data/leave.ts` · **`leave_days()`** — SQL

```
(end - start + 1) - (halfDayStart ? 0.5 : 0) - (halfDayEnd ? 0.5 : 0)
```

⚠️ **Holidays and weekly offs inside the range are counted.** Flagged, never ruled on. The
apply form says so on screen rather than hiding it.
Edge: `halfDayEnd` is disabled in the UI for a single-day request.

## Leave balance

**`getLeaveBalances(employeeId)`** — `src/data/leave.ts`

- **In:** employee id
- **Out:** per leave type — `balance`, `credited`, `debited`, `adjusted`, `pendingDays`,
  and `breakdown[]`: every transaction oldest-first with a running total
- **Method:** `balance = Σ(credit) + Σ(adjustment) − Σ(debit)`. Never stored.
- **Pending leave is excluded** from the balance and reported separately — it is not
  debited until approved. The UI states this.
- Edge: no transactions → balance 0 and the expander says so.

## Deciding a request

**`decideRequest()`** — `src/data/requests.ts` · **`decide_request()`** — SQL

Validation (skipped for `commented`): request exists · still pending · caller is the
approver or HR · a rejection carries a comment.

Side effects, in the same transaction:
| Type | On approval |
| --- | --- |
| `leave` | leave request approved · debit transaction inserted · every day in the range recomputed |
| `regularisation` | day status and `last_out` updated, `was_regularised = true` |
| `profile-change` (`personalPhone`) | written to `employee_private` |
| others | status only |

A `request_decisions` row is always written, including for a comment.

## Editing a profile

**`updateEmployee(user, employeeId, changes)`** — `src/data/directory.ts`

- HR admin → applied immediately
- Anyone editing themselves → one `profile-change` request **per changed field**; the
  profile keeps the old value until approved
- Any other combination → throws

**`applyEmployeeChanges()`** — if `department`, `designation` or `manager_id` changed, the
current `employment_records` row is closed (`valid_to = yesterday`) and a new one opened
from today. History is never rewritten.
⚠️ Flagged: changes take effect today; back-dating and future-dating are unsupported.

## Reporting line

**`reportingLine(managerId)`** — `src/lib/permissions.ts` · **`manages()`** — SQL
Recursive descent to any depth. Handles no reports (empty) and many reports.
⚠️ No cycle guard beyond the `manager_id <> id` constraint; a longer cycle would loop.

## Visibility

**`canViewPersonalData(user, employeeId)`** = self ∨ hr_admin ∨ manages
Mirrored exactly as `can_see_person()` in SQL. **Keep them in step.**

Documents: org-wide (`employee_id is null`) → everyone. Otherwise HR always; the owner
unless `hr-only`; the manager only when `visibility = 'manager'`.

## Teammate state

**`getTeammates(user)`** — `src/data/team.ts`

Scope: own department ∪ (for a manager) the whole reporting line, minus yourself.
State, in order: on approved leave → `away` · approved WFH covering today → `remote` ·
no first punch → `not-in` · first punch ≤ shift start → `on-time` · else `late`.

⚠️ Two flags: shift assignment is derived from location (no roster), and this shows a
colleague's punch state to someone who does not manage them.

## Celebrations

**`getCelebrations(days = 21)`** — `src/data/workplace.ts`
Next occurrence of a `MM-DD` within the window, for birthdays and joining anniversaries
(anniversaries only when years > 0). Uses `birth_month_day`, never the birth year.

## Off this week

**`getAwayThisWeek(scopeIds)`** — week is Monday–Sunday around `MOCK_TODAY`.
Approved **and pending** leave overlapping the week.
⚠️ Flagged: work-from-home does **not** count as away — the person is working.

## Departments

**`getDepartments(user)`** — headcount and joiners in the last 90 days. HR sees all;
others see their own department plus their reporting line. Inactive people excluded.
⚠️ The 90-day "recent joiner" window was chosen, not specified.

## Reactions

**`toggleReaction(postId, employeeId, type)`** — reacting twice removes it. Stored as rows
keyed `(post_id, employee_id, type)` so concurrent reactions cannot overwrite each other.

## Validation rules, collected

| Where | Rule |
| --- | --- |
| Leave apply | end ≥ start; reason required; half-day-end disabled on single days |
| Regularisation | reason required |
| Raise request | reason required; on-duty needs a location; partial day needs to > from |
| Reject | comment required |
| Asset request | name and reason required |
| Announcement / post | non-empty body |
| Policy acknowledge | must open the policy first |
| Profile edit | non-HR may only change fields in `selfEditableFields` |

## Time and timezone

`MOCK_TODAY = '2026-09-09'` pins the mock app. In SQL, `ist_date(ts)` converts to a
calendar date in `Asia/Kolkata` — **essential**, because the database is in Singapore and
a 21:00 punch in Noida would otherwise land on the wrong day.

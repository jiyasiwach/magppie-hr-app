# 13. Bugs, Limitations & Open Questions

## Part 1 — Known bugs

No open bug is known to be *unfixed*. Four were found and fixed during development; they
are recorded because each is a regression risk and a test candidate.

### Fixed

| # | Bug | Severity | Cause | Fix |
| --- | --- | --- | --- | --- |
| 1 | Any mutation unmounted the surrounding subtree, destroying open forms and typed input | **High** | `useAsync` dropped to `loading` on every store-version bump | Two keys: `depsKey` (the question) and `fetchKey` (question + version). A version bump refetches while still showing data. |
| 2 | Home dial read 4h 37m while the timer read 6h 56m | Medium | Dial used the pinned mock clock, timer used real time | Both recompute against the same second via `useNow()` + exported `workedHours()` |
| 3 | "On time" chip permanently 0 for every manager | Medium | Mock punches generated ~09:00 regardless of shift; factory shift starts 08:00 | Generator now works from each person's assigned shift, ~72% on time |
| 4 | "My teammates" counted 1 and listed nobody, as an employee | Medium | Scope was the *personal-data* permission scope (self only), then grouping filtered self out | Scope is now department ∪ reporting line, minus self |

**Reproduce #1 (regression test):** open a profile as HR, start editing, have any other
mutation land, and confirm the form keeps its values.

### Known limitations, not bugs

| Limitation | Consequence |
| --- | --- |
| No file storage | Documents are records; "Download" explains there is nothing to download; post images are captions |
| Nothing persists | The in-memory store resets on reload |
| No automated tests | Every change needs manual verification |
| Location not captured on the Punch button | The button records a punch with `location = null` and says so |
| Feedback form goes nowhere | Says so plainly rather than faking success |
| No cycle guard in `reportingLine` beyond `manager_id <> id` | A longer manager cycle would loop; the DB constraint does not prevent A→B→A |
| Sidebar/page contrast is only 1.11:1 | Carried by a 1px border — a consequence of following the brief's hex values over its "lighter beige" wording |

---

## Part 2 — Open questions

**These are the most valuable part of this handover.** Each was flagged rather than
guessed, in line with the brief: *"Wrong assumptions in an HR app become HR disputes."*
Several are now encoded in RLS or SQL and are one line each to change.

### Blocking

| # | Question | Where it bites |
| --- | --- | --- |
| 1 | **Create the Supabase project** (`magppie-hr-prod`, Magppie1234's Org, ap-southeast-1) and supply the ref | Nothing backend can proceed |
| 2 | **The product name** | Renders as `[APP_NAME]` in the top bar and browser tab, including on the public deployment |

### Policy — needed before real data

| # | Question | Current placeholder | Where |
| --- | --- | --- | --- |
| 3 | **Real shift timings, and who is on which** | Five invented shifts; assignment derived from location | `0004_reference_data.sql`, `employee_shifts` |
| 4 | **Who counts as HR admin?** | HR department or no manager | `employees.role`, `deriveRole()` |
| 5 | **Do holidays and weekly offs inside a leave range consume leave?** | They are counted | `leave_days()` |
| 6 | **Per-location weekly offs** | Sat/Sun for everyone | `refresh_attendance_day()` |
| 7 | **What does an approved request actually do?** Overtime adds no hours; a partial day shortens no expected day; on-duty marks no attendance | Stored, no effect | `decide_request()` |
| 8 | **Approval chain beyond one manager** — escalation, delegation when away | One level, HR fallback | `apply_for_leave()`, `raise_request()` |
| 9 | **What happens when probation ends?** | Nothing | no code |
| 10 | **Does a leave clash block approval?** | Shown, not enforced | Team calendar |
| 11 | **Should a colleague see another's punch state?** The team chips require it | Allowed | `employee_shifts` policy, `getTeammates()` ⚠️ |
| 12 | **Document visibility matrix** | Three values, guessed | `documents.visibility` |
| 13 | **Time limit on regularisation** | None | `raise_request()` |
| 14 | **Effective dating for profile changes** — back-dating a transfer | Today only | `applyEmployeeChanges()` |
| 15 | **Who may post an announcement?** | HR only | announcements policy |
| 16 | **Wall moderation** — who may archive, and on what grounds | Author or HR | posts policy |
| 17 | **Half-day threshold** | Under 4 hours | `refresh_attendance_day()` |
| 18 | **"Recent joiner" window** | 90 days | `getDepartments()` |
| 19 | **Is work-from-home "away"?** | No — the person is working | `getAwayThisWeek()` |
| 20 | **Reaction types** | Like / Celebrate / Support | `reaction_type` enum |
| 21 | **What belongs on the ID card?** No blood group, emergency contact, QR or validity exists | Only fields the record holds | `/me/id-card` |
| 22 | **Where does feedback go?** | Nowhere | `/feedback` |
| 23 | **Is there an audit log?** | No — the activity trail is derived from records that happen to exist | `getActivityTrail()` |
| 24 | **"Late" as a status** | Does not exist; needs shift timings | — |

### Governance and data protection

| # | Question |
| --- | --- |
| 25 | **Cross-border transfer.** The database will sit in Singapore holding Indian employees' personal data. This was chosen against a recommendation of Mumbai and needs a documented basis before payroll data lands in it. |
| 26 | **Do factory and site staff have Google Workspace accounts?** SSO was chosen assuming they do. If not, a second sign-in method is needed. |
| 27 | **Loading real staff data.** The 40 employees are invented. Importing real names, phone numbers and dates of birth is an HR decision, not a migration's. |
| 28 | **Backup retention for HR records** — an employment-law question. |
| 29 | **The repository is public.** Fine today (no secrets, invented data). Revisit before real data or before anything sensitive lands in the codebase. |

### Accounts and infrastructure

| # | Item | State |
| --- | --- | --- |
| 30 | Repo on `jiyasiwach`, should be `Magppie1234` | Temporary, owner's choice |
| 31 | Deployment on personal Vercel, should be the Magppie team | Temporary, owner's choice |
| 32 | No git-linked auto-deploy | Blocked by #30 |
| 33 | Global git identity on the dev machine is `SUNROOOF` | Overridden repo-locally; must stay overridden |

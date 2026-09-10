# 8. Workflows

Step by step, including what the system does behind each step.

---

## 1. Clocking in and out

1. Employee opens Home. `getTodayStatus()` returns today's punches and derived state.
2. Taps **Clock In** (green, full width).
3. `punch()` / `clock_punch('in')` inserts a punch at `now()`.
4. **Trigger** `punches_after_insert` → `refresh_attendance_day()` recomputes the day.
5. Card re-renders: timer starts from the punch, dial advances, status shows Present.
6. At the end of the day **Clock Out** (red) inserts the closing punch; hours finalise.

**Notes:** the separate **Punch** button records a location-tagged punch — location is
*not* captured yet and the UI says so. Punches are append-only; a mistake is fixed by
workflow 3, never by editing.

---

## 2. Applying for leave

1. Home quick action, or Me → Time → Apply Leave.
2. Choose type, dates, half-day flags, reason. The form shows the computed day count and
   states that holidays and weekly offs inside the range are counted.
3. `submitLeaveRequest()` / `apply_for_leave()` creates a `leave_requests` row **and** a
   `requests` row, atomically, routed to the manager (fallback: HR).
4. It appears in Request History as Pending, and in the manager's Inbox.
5. **Balance does not move.** It shows separately as "awaiting approval".
6. The applicant may cancel while pending — the record is cancelled, not deleted.

---

## 3. Fixing a wrong attendance day

1. Me → Time → Logs and shifts → tap the day.
2. Day detail shows status, first in, last out, hours and every raw punch.
3. **"This day looks wrong — request a fix"**.
4. Choose what it should be, the times, and a reason (required).
5. `raiseRegularisation()` / `raise_request('regularisation')` creates the request and
   marks the day `pending-regularisation`.
6. Manager approves → the day's status and `last_out` update and `was_regularised` is set,
   which protects it from being recomputed away by later punches.

---

## 4. Approving anything

1. Manager or HR opens **Inbox**. Everything pending is in one list.
2. Optionally filter by type chip.
3. Each row shows requester, type, a one-line summary, and the full payload inline — no
   drilling in.
4. **Approve**, or **Reject** (a comment is required), or **Comment only**.
5. `decideRequest()` / `decide_request()` validates, writes a `request_decisions` row,
   updates the request, and applies the side effects for that type.
6. The row leaves the pending list; the requester sees the outcome and the comment.

**HR notices** are not approvals — they carry a single **Mark as read**.

---

## 5. Changing your own details

1. Directory → your own profile → **Edit my details**.
2. Only permitted fields are offered (currently the personal phone).
3. **Send for approval** → one `profile-change` request per changed field, routed to HR.
4. Your profile keeps the old value, and says so.
5. HR approves in the Inbox → the value is written to `employee_private`.

HR editing someone else skips all of this and applies immediately — and a change to
department, designation or manager opens a new employment record rather than rewriting
history.

---

## 6. Acknowledging a policy

Me → Documents → Policies → **Read** (the text expands; the acknowledge button is disabled
until it is opened) → **I have read and acknowledge this** → date recorded, unique per
(policy, person), acknowledging twice is a no-op.

---

## 7. Requesting an asset

Me → Assets → Request an asset → what and why → routed to HR → appears in Asset requests
with its status and any comment.

---

## 8. Posting to the Wall

Wall → composer → body, optional image caption (no upload yet) → post appears newest
first. Anyone can react (reacting again removes it) or comment. Nothing deletes; authors
and HR can archive.

From Home, **Wish them** links into the Wall with a birthday or anniversary message
pre-filled — the Wall is the only channel that exists, which is a flagged limitation.

---

## 9. Onboarding a new employee (HR)

**Partly built.** HR creates the person in the Directory (all fields editable), which
opens their first employment record. What is missing: no document checklist, no asset
issue flow, no probation-confirmation step, and nothing happens when a probation end date
passes. Flagged.

---

## 10. Signing in (designed, not built)

1. User hits the app; middleware refreshes the session.
2. No session → sign-in screen → **Continue with Google**.
3. Google returns to `/auth/callback`; the code is exchanged for a session.
4. **Trigger** `on_auth_user_created` matches `auth.users.email` to
   `employees.work_email` and links `auth_user_id`.
5. No matching employee → the session exists but has no employee record, and the app must
   say so plainly. **Signing in never creates an employee.**
6. RLS uses `auth.uid()` from that point on.

---

## 11. Deploying

Currently manual: `npx vercel@latest --prod --yes` from the project root, using the
CLI signed in on the developer's machine. There is no CI. Once the repo moves to
`Magppie1234`, a git-linked Vercel project on the Magppie team gives push-to-deploy.

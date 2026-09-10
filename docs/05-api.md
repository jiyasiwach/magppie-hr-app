# 5. API Documentation

## Read this first

**There are no HTTP API routes in this repository.** There is no `src/app/api/` directory
and no route handler. The brief for the front-end passes explicitly excluded them.

The API surface, once the migrations are applied, is **Supabase**: auto-generated
PostgREST endpoints over the tables, plus the RPC functions in `0003_functions.sql`.
Nothing below has been called against a live server yet.

Today, every screen calls a TypeScript function in `src/data/*` instead. Those signatures
are the real contract — see `docs/15-code-reference.md`.

---

## Base URL and headers

```
Base:  https://<PROJECT_REF>.supabase.co
REST:  /rest/v1/<table>
RPC:   /rest/v1/rpc/<function>
Auth:  /auth/v1/*
```

Every request:

| Header | Value |
| --- | --- |
| `apikey` | the anon / publishable key |
| `Authorization` | `Bearer <access_token>` from the user's session |
| `Content-Type` | `application/json` |
| `Prefer` | `return=representation` when you want the row back |

In the app these are set by `@supabase/ssr`; you never build them by hand.

**Authorisation is row-level security, not endpoint permissions.** Every endpoint is
reachable by every signed-in user; what comes back is filtered by the policies in
`0002_rls.sql`. An empty array is a legitimate answer meaning "the policy said no".

---

## RPC functions — the write API

These carry the business rules. They are `SECURITY DEFINER`, so they run with elevated
rights and do their own permission checks internally.

### `clock_punch`
Record a punch for the signed-in employee.

| | |
| --- | --- |
| **URL** | `POST /rest/v1/rpc/clock_punch` |
| **Auth** | required |

**Body**
```json
{ "p_direction": "in", "p_source": "web", "p_location": null }
```
`p_direction`: `in` \| `out` (required). `p_source`: `web` \| `mobile` \| `biometric` \|
`manager-marked`, default `web`. `p_location`: text or null.

**Response `200`** — the created punch row.
```json
{ "id": "uuid", "employee_id": "uuid", "punched_at": "2026-09-09T09:43:00+00:00",
  "direction": "in", "source": "web", "location": null, "created_at": "..." }
```

**Errors**
| Condition | Message |
| --- | --- |
| No employee linked to the sign-in | `No employee record is linked to this sign-in.` |

**Side effect:** the `punches_after_insert` trigger recomputes that day's
`attendance_days` row.

---

### `apply_for_leave`
Create a leave request and its generic `requests` row, atomically.

`POST /rest/v1/rpc/apply_for_leave`

```json
{ "p_leave_type": "uuid", "p_start": "2026-09-15", "p_end": "2026-09-16",
  "p_half_start": false, "p_half_end": false, "p_reason": "Family function" }
```

**Response `200`** — the new `requests.id` as a uuid string.

**Validation**
| Rule | Error |
| --- | --- |
| session has an employee | `No employee record is linked to this sign-in.` |
| `p_end >= p_start` | `The end date is before the start date.` |
| reason not blank | `A reason is required.` |

**Notes:** the approver is the applicant's `manager_id`, falling back to an HR admin.
Days are computed by `leave_days()`. **The balance is not debited here** — only on
approval.

---

### `cancel_leave_request`
`POST /rest/v1/rpc/cancel_leave_request` — `{ "p_leave_request": "uuid" }`

Sets both the leave request and its wrapper request to `cancelled`. Nothing is deleted.

| Rule | Error |
| --- | --- |
| request exists | `No such leave request.` |
| owner or HR | `You can only cancel your own leave.` |
| still pending | `Only a pending request can be cancelled.` |

---

### `raise_request`
The other request types: `regularisation`, `wfh`, `on-duty`, `overtime`, `partial-day`,
`asset`, `expense`, `document`, `profile-change`.

`POST /rest/v1/rpc/raise_request`
```json
{ "p_type": "wfh", "p_payload": { "startDate": "2026-09-15", "endDate": "2026-09-16",
                                   "reason": "Showroom shut for maintenance" } }
```

**Response `200`** — the new `requests.id`.

**Rejects** `leave` and `hr-notice`: `Use the dedicated function for this request type.`

**Routing:** `asset`, `expense`, `profile-change` and `document` go to an HR admin;
everything else to the raiser's manager, falling back to HR.

**Side effect:** a `regularisation` marks that `attendance_days` row
`pending-regularisation`.

**Expected payloads by type**
| Type | Payload |
| --- | --- |
| `regularisation` | `date`, `currentStatus`, `requestedStatus`, `requestedFirstIn`, `requestedLastOut`, `reason` |
| `wfh` | `startDate`, `endDate`, `reason` |
| `on-duty` | `date`, `location`, `reason` |
| `overtime` | `date`, `hours`, `reason` |
| `partial-day` | `date`, `from`, `to`, `reason` |
| `asset` | `assetName`, `category`, `reason` |
| `profile-change` | `employeeId`, `field`, `from`, `to`, `reason` |
| `document` | `documentType`, `fileName`, `reason` |

---

### `decide_request`
Approve, reject or comment. **This is where the side effects live.**

`POST /rest/v1/rpc/decide_request`
```json
{ "p_request": "uuid", "p_decision": "approved", "p_comment": "" }
```
`p_decision`: `approved` \| `rejected` \| `commented`.

**Validation (skipped for `commented`)**
| Rule | Error |
| --- | --- |
| request exists | `No such request.` |
| status is pending | `That request has already been decided.` |
| you are the approver, or HR | `That request is not waiting on you.` |
| rejection has a comment | `A rejection needs a comment.` |

**Side effects on approval**
- `leave` → sets the leave request approved, inserts the **debit** transaction, and
  recomputes every attendance day in the range — all in one transaction
- `regularisation` → updates the attendance day's status and `last_out`, sets
  `was_regularised`
- `profile-change` on `personalPhone` → writes `employee_private.personal_phone`

A `request_decisions` row is always inserted, including for `commented`.

---

### `acknowledge_policy`
`POST /rest/v1/rpc/acknowledge_policy` — `{ "p_policy": "uuid" }`.
Idempotent: `ON CONFLICT DO NOTHING`.

---

## REST reads

Standard PostgREST. Examples (as the client builds them):

```
GET /rest/v1/employees?select=*&status=eq.active&order=full_name.asc
GET /rest/v1/attendance_days?employee_id=eq.<uuid>&date=gte.2026-09-01&date=lte.2026-09-30
GET /rest/v1/leave_transactions?employee_id=eq.<uuid>&leave_type_id=eq.<uuid>&order=date.asc
GET /rest/v1/requests?status=eq.pending&current_approver=eq.<uuid>&order=raised_on.desc
GET /rest/v1/posts?select=*,post_comments(*),post_reactions(*)&order=posted_on.desc
```

Writes that are plain inserts and permitted by policy (a punch by yourself, a post, a
comment, a reaction, a policy acknowledgement, a self-uploaded document) may go through
REST; everything with a rule behind it must use an RPC.

## Error shape

PostgREST returns:
```json
{ "code": "42501", "details": null, "hint": null,
  "message": "new row violates row-level security policy for table \"employees\"" }
```
Common codes: `42501` RLS refusal · `23505` unique violation · `23503` FK violation ·
`P0001` a `raise exception` from one of the RPCs above (the message is user-facing and
was written to be shown as-is).

## Auth endpoints

Handled entirely by `@supabase/ssr`. See `docs/10-authentication.md`.

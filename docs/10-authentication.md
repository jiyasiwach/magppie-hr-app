# 10. Authentication & Authorisation

## Current state

**There is no authentication.** This is deliberate and was required by the brief for the
front-end passes. Instead:

- **`getCurrentUser()` in `src/lib/auth.ts` is the only thing that decides who is signed
  in.** No component hardcodes a person; there is no demo-login button and no bypass.
- A **role switcher** in the top bar (and in the account drawer on mobile) changes which
  of three mock people that function returns, so all three role views can be checked.
- `CurrentUserProvider` holds the resolved user in React context; the choice persists in
  `localStorage` under `magppie-hr:mock-user`.
- **Logout exists but is inert** and says so, rather than pretending to end a session that
  does not exist.

### The three mock personas
| Persona | Employee | Derived role |
| --- | --- | --- |
| Employee | Priya Sharma (`emp-008`) | `employee` |
| Manager | Vikram Nair (`emp-003`), 8 reports | `manager` |
| HR admin | Imran Qureshi (`emp-005`) | `hr-admin` |

### Role derivation — a placeholder that must not survive
`deriveRole()` in `src/lib/auth.ts`: Human Resources department **or** no manager →
`hr_admin`; has direct reports → `manager`; otherwise `employee`.

This was flagged from the first day. The database stores `employees.role` and **that** is
authoritative once the backend lands, because RLS cannot rest on a value the browser
computes.

---

## Target state — Google Workspace SSO

Chosen by the owner over email/password and phone OTP.

### Flow
```
User → app → middleware refreshes session
     → no session → /sign-in → "Continue with Google"
     → Google consent (Internal, mymagppie.com)
     → https://<ref>.supabase.co/auth/v1/callback
     → Supabase creates auth.users row + session
     → trigger on_auth_user_created:
          UPDATE employees SET auth_user_id = new.id
           WHERE work_email = new.email AND auth_user_id IS NULL
     → app redirects to /
     → every query now carries auth.uid(); RLS applies
```

### Signing in never creates an employee
If the Google address is not already a `work_email` in `employees`, the person gets a
valid session with **no employee record**. Every RLS helper returns null/false, so they
see nothing. The UI must show a clear "your account is not linked to an employee record —
contact HR" state. **This is intentional: an HR directory is not self-service.**

### Sessions and tokens
Handled entirely by `@supabase/ssr`, which stores the session in cookies (not
`localStorage`) so server components can read it.

- Access token: JWT, ~1 hour, carries `sub` = `auth.users.id`, which `auth.uid()` reads
- Refresh token: rotating, long-lived, in an httpOnly cookie
- **Refresh:** Next.js middleware must call `supabase.auth.getUser()` on every request and
  write refreshed cookies back. **This middleware does not exist yet — it must be written
  as part of the auth work.** Without it, sessions expire mid-use on server routes.

### Still to build
1. `src/middleware.ts` — session refresh + route protection
2. `src/app/sign-in/page.tsx` — one button, and an explanation of the no-employee state
3. `src/app/auth/callback/route.ts` — exchange the code for a session
4. Replace `getCurrentUser()` with a Supabase session lookup
5. Delete `setActiveMockUserId`, `mockPersonas`, `getActiveMockUserId`, `deriveRole`, and
   the role switcher UI in `AppShell.tsx` and `ProfileDrawer.tsx`

---

## Authorisation

Two layers that must agree.

**In the app** — `src/lib/permissions.ts`, used for what to render:
`isSelf` · `managesEmployee` · `reportingLine` · `directReports` ·
`canViewPersonalData` · `canEditEmployeeFully` · `canEditOwnField` · `canViewDocument` ·
`canSeeApprovals` · `canActOnRequest` · `canSeeTeamCalendar` · `canSeeSettings` ·
`visibleEmployeeIds`

**In the database** — `0002_rls.sql`, the real boundary:
`current_employee_id()` · `current_app_role()` · `is_hr_admin()` · `manages()` ·
`can_see_person()`

> The app-side predicates decide what to *show*. The database decides what you can
> *have*. Keeping them in step is a maintenance obligation: if you change one, change the
> other. The app-side check is a UX affordance, never a security control.

### The rule, in one line
**You, your reporting line, or HR.** `can_see_person(target)` =
`target = current_employee_id() OR is_hr_admin() OR manages(target)`.

### Deliberate exceptions
| Table | Who can read | Why |
| --- | --- | --- |
| `employees` | everyone signed in | It is a company directory |
| `employee_shifts` | everyone signed in ⚠️ | The team chips need it — flagged |
| `posts`, `post_comments`, `post_reactions` | everyone signed in | It is a company wall |
| `documents` where `employee_id IS NULL` | everyone signed in | Company-wide documents |

### Permissions matrix

| Action | Employee | Manager | HR admin |
| --- | --- | --- | --- |
| See the directory | ✅ | ✅ | ✅ |
| See someone's phone / DOB | self | self + line | ✅ |
| Edit a profile | own phone, via request | own phone, via request | ✅ direct |
| See attendance | own | own + line | ✅ |
| Punch | own | own; mark for line | ✅ |
| Approve | ❌ | own line | ✅ any |
| See the team calendar | ❌ | ✅ | ✅ |
| Post an announcement | ❌ | ❌ | ✅ ⚠️ |
| Post to the Wall | ✅ | ✅ | ✅ |
| Organisation settings | ❌ | ❌ | ✅ |
| Upload a document for someone | ❌ | ❌ | ✅ |

⚠️ = flagged assumption.

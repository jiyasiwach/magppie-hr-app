# 1. Project Overview

## Name

The product name **has not been chosen**. Everywhere it appears, the app renders the
literal placeholder `[APP_NAME]`, defined once in `src/lib/constants.ts`. The repository
and package are named `magppie-hr-app`, which is a working name, not the product name.

## Vision

Replace Keka — the third-party HR SaaS Magppie currently pays for — with an in-house
application that fits how Magppie actually works: a stone-kitchen manufacturer with
office staff, showroom staff, factory floor workers and installers on client sites.
The workforce is mostly not at a desk, so the product is phone-first.

## Objective

Own the employee record, attendance, and leave end to end, then extend into the modules
Keka currently covers (payroll, onboarding, performance) once the core is trusted.

## Scope

### In scope, and built
- App shell: five sections, top bar with colleague search, account drawer
- Home dashboard with clock in/out
- Inbox — one generic approvals + notices queue
- Wall — company social feed
- Me — Time, Finances, Documents, Assets
- My Team — departments, absence, teammate states, manager views
- Directory, employee profile, reporting tree
- Attendance logs, regularisation
- Leave balances, application, history, team calendar
- Documents (personal + org-wide), policy acknowledgements
- Assets and asset requests
- Settings, ID card, feedback, about

### In scope, designed, not applied
- Postgres schema, row-level security, business-rule functions (Supabase)
- Google Workspace SSO

### Explicitly out of scope for this pass
- Payroll and payslips (a "not configured" state exists, deliberately)
- Expense claims (same)
- Onboarding, performance reviews, appraisals
- Hiring and recruitment

## Features

| Area | Feature | Status |
| --- | --- | --- |
| Shell | Five-section nav, phone + desktop | Done |
| Shell | Colleague search (2-char threshold) | Done |
| Shell | Account drawer: settings, ID card, feedback, about, logout | Done |
| Shell | Role switcher (mock only — goes with real auth) | Done |
| Home | Quick actions, Today card, off this week, wish them, announcements, holidays | Done |
| Home | Clock in / clock out, live timer, separate location punch | Done (location not captured) |
| Inbox | Generic queue, type chips, approve/reject/comment inline | Done |
| Wall | Posts, reactions, comments, composer | Done (no image upload) |
| Me · Time | Raise request, logs and shifts, request history, apply leave, balances, holidays | Done |
| Me · Finances | Salary, Expenses | Not-configured state, by design |
| Me · Documents | Org documents, my documents, ID card, policies | Done (no file store) |
| Me · Assets | Assigned assets, asset requests | Done |
| My Team | Departments, off this week, teammates + 4 live-count chips, manager views | Done |
| Directory | Search, filters, table/cards, profile, reporting tree, HR editing | Done |
| Backend | Schema, RLS, RPCs, auth linking | Written, **not applied** |

## Modules

`shell` · `home` · `inbox/requests` · `wall` · `me` · `team` · `directory` ·
`attendance` · `leave` · `documents` · `assets` · `settings`

## User roles

Three, one set of screens, content decided by role. **Never build three copies.**

| Role | Sees |
| --- | --- |
| `employee` | Own profile, attendance, leave, documents, requests; the directory; their department on My Team |
| `manager` | Everything an employee sees, plus their reporting line's attendance and leave calendar, plus an approvals queue for their team |
| `hr_admin` | Everything, plus the full directory with edit rights, plus organisation settings and org-wide views |

A fourth payroll role is named in the brief as **not existing yet**. Do not add it.

Currently the role is **derived** in `src/lib/auth.ts::deriveRole()` — HR department or
no manager → `hr_admin`; has direct reports → `manager`; else `employee`. This is a
flagged placeholder. The database stores `employees.role` and that is authoritative once
the backend lands.

## Current implementation status

- **Front end: complete** for the scope above, deployed at `https://magppie-hr-app.vercel.app`
- **Data: 100% mock**, in memory, resets on reload
- **Backend: designed, zero applied.** No Supabase project exists.
- **Auth: none.** A role switcher stands in.
- **Tests: none automated.**

## Future roadmap

**Immediate (blocked on one action)**
1. Create the Supabase project; apply the four migrations
2. Wire `src/data/*` to Supabase; delete the mock store
3. Google Workspace SSO; delete the role switcher

**Next**
4. File storage for documents and post images (Supabase Storage + RLS)
5. Real employee import (HR decision — see cross-border note)
6. Answer the 18 open questions; tighten RLS accordingly
7. Automated tests — there are none today
8. Move repo to `Magppie1234`, deployment to the Magppie Vercel team, enable
   git-linked auto-deploy

**Later**
9. Rostering (shift assignment is currently derived from location)
10. Expenses, then payroll
11. Onboarding and exit checklists
12. Push notifications / mobile wrapper

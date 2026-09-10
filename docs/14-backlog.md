# 14. Prioritised Backlog

## Done

- Project scaffold: Next.js 16, TypeScript, CSS Modules
- Data contract — all 15 shapes plus Policy, PolicyAcknowledgement, Shift, PostReaction, PostComment
- Mock data: 40 invented employees, deterministic attendance, leave ledger, ~80 requests
- `src/data` swap layer, async throughout
- Auth seam (`getCurrentUser`) + role switcher
- App shell: five sections, top bar, colleague search, account drawer, responsive nav
- Home: quick actions, Today card, clock in/out, live timer, punch, off this week, wish them, announcements, holidays
- Inbox: generic queue, type chips, inline approve/reject/comment, HR notices
- Wall: posts, reactions, comments, composer
- Me: Time / Finances / Documents / Assets
- My Team: departments, absence, teammate chips with live counts, manager views
- Directory: search, filters, profile, editing, reporting tree, employment history
- Attendance: month calendar, day detail, regularisation, team day view
- Leave: balances with full ledger, apply, history, team calendar
- Documents, org documents, policies with read-gating, assets
- Visual system: three-layer palette, status colours, original icon set, AA contrast verified
- Deployed to production
- Supabase schema, RLS and business-rule functions **written**

## In progress

| Task | State |
| --- | --- |
| Supabase backend | Migrations written, **none applied** — blocked |

## Blocked

| # | Blocker | Needs |
| --- | --- | --- |
| B1 | Supabase project does not exist | Owner creates it and supplies the ref |
| B2 | Google OAuth not configured | Google Workspace admin |
| B3 | Git-linked deploys | Repo transfer to `Magppie1234` |
| B4 | 24 policy questions | Decisions from HR — see `docs/13` |

## Next — in order

### P0 · Make the backend real
1. Create the project; apply `0001`–`0004`
2. Run Supabase advisors; fix findings
3. Generate DB types (`supabase gen types typescript`)
4. Seed a development dataset from the mock generator
5. **Wire `src/data/*` to Supabase, one module at a time, keeping every signature.**
   Suggested order: `directory` → `attendance` → `leave` → `requests` → `documents` →
   `workplace` → `team` → `home` → `notifications`
6. Delete `src/data/store.ts` and `src/mocks/`; remove `reviewFlags` from Settings

### P0 · Make auth real
7. `src/middleware.ts` — session refresh (**does not exist; sessions will expire without it**)
8. Sign-in screen + `/auth/callback`
9. Replace `getCurrentUser()`; delete `mockPersonas`, `setActiveMockUserId`, `deriveRole`,
   and the role switcher
10. Handle "signed in but no employee record" explicitly
11. **Test RLS with three real sessions** — the single most important test on this project

### P1 · Close the honest gaps
12. Supabase Storage for documents and post images, with matching RLS
13. Real employee import (after Q27 and Q25 are answered)
14. Location capture on the Punch button, or remove the button
15. Route feedback somewhere real, or remove the form
16. A real audit log — the activity trail is currently derived

### P1 · Quality
17. Vitest + the unit tests in `docs/12`, starting with the four fixed bugs
18. RLS integration tests against a local Supabase
19. CI workflow (lint, typecheck, build, test)
20. Playwright over the five core workflows

### P2 · Infrastructure hygiene
21. Transfer repo to `Magppie1234`
22. Recreate the Vercel project on the Magppie team; delete the personal one
23. Env vars on Vercel; enable PITR backups
24. Decide on a custom domain

### P2 · Product
25. Answer and implement the policy questions in `docs/13`
26. Rostering — real shift assignment
27. Probation confirmation flow
28. Approval delegation and escalation
29. Multi-method sign-in if factory staff lack Google accounts

### P3 · Future modules
30. Expenses (policy first, then screens)
31. Payroll — the "not configured" state is the placeholder
32. Onboarding and exit checklists
33. Performance reviews
34. Push notifications / mobile wrapper
35. Offline punch queue for sites with poor signal

## Explicitly not planned
Hiring and recruitment. A payroll *role*. Anything copied from Keka.

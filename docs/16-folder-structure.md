# 16. Folder Structure

```
magppie-hr-app/
├── AI_MEMORY.md                  ← read this first
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
├── .env.example
├── .gitignore
├── AGENTS.md
│
├── .claude/
│   └── launch.json               dev server config (port 3040)
│
├── docs/                         this handover package
│   ├── 01-project-overview.md
│   ├── 02-conversation-history.md
│   ├── 03-architecture.md
│   ├── 04-database.md
│   ├── 05-api.md
│   ├── 06-ui-ux.md
│   ├── 07-business-logic.md
│   ├── 08-workflows.md
│   ├── 09-integrations-and-env.md
│   ├── 10-authentication.md
│   ├── 11-deployment.md
│   ├── 12-testing.md
│   ├── 13-bugs-and-open-questions.md
│   ├── 14-backlog.md
│   ├── 15-code-reference.md
│   └── 16-folder-structure.md
│
├── public/                       next.svg, vercel.svg, etc. (unused)
│
├── supabase/
│   └── migrations/
│       ├── 0001_schema.sql       22 tables, 16 enums, indexes, triggers
│       ├── 0002_rls.sql          RLS on everything + 5 helper functions
│       ├── 0003_functions.sql    business rules as RPCs
│       └── 0004_reference_data.sql   leave types, shifts, holidays
│
└── src/
    ├── app/
    │   ├── layout.tsx            font, metadata from APP_NAME, AppShell
    │   ├── globals.css           palette tokens + reset
    │   ├── page.tsx              HOME
    │   ├── home.module.css
    │   ├── favicon.ico
    │   ├── about/page.tsx
    │   ├── attendance/           page + module.css
    │   ├── directory/
    │   │   ├── page.tsx          list, search, filters
    │   │   ├── [id]/             profile + profile.module.css
    │   │   └── tree/             reporting tree
    │   ├── feedback/
    │   ├── inbox/                INBOX
    │   ├── leave/
    │   │   ├── page.tsx          balances + history
    │   │   └── apply/page.tsx
    │   ├── me/
    │   │   ├── page.tsx          ME — four tabs
    │   │   └── id-card/
    │   ├── policies/
    │   ├── requests/
    │   │   ├── page.tsx          history
    │   │   └── new/              raise a request
    │   ├── settings/
    │   ├── team/                 MY TEAM
    │   └── wall/                 WALL
    │
    ├── components/
    │   ├── ui/
    │   │   ├── index.tsx         all shared primitives (one barrel)
    │   │   ├── icons.tsx         original icon set
    │   │   └── ui.module.css
    │   ├── shell/
    │   │   ├── AppShell.tsx      top bar + both navs
    │   │   ├── CurrentUserProvider.tsx
    │   │   ├── ColleagueSearch.tsx
    │   │   ├── ProfileDrawer.tsx
    │   │   ├── nav.ts
    │   │   └── shell.module.css
    │   ├── home/TodayCard.tsx + home.module.css
    │   ├── attendance/           PunchControl, MonthCalendar, DayDetail, TeamToday
    │   ├── leave/                LeaveBalances, LeaveRequestForm, LeaveHistory, TeamCalendar
    │   ├── requests/             ApprovalList, renderers
    │   ├── documents/            DocumentsPanel, OrgDocuments, PolicyList
    │   ├── assets/               AssetsPanel
    │   └── directory/            ProfileEditor
    │
    ├── data/                     ← THE SWAP POINT
    │   ├── store.ts              in-memory mock store (delete after swap)
    │   ├── directory.ts
    │   ├── attendance.ts
    │   ├── leave.ts
    │   ├── requests.ts
    │   ├── documents.ts
    │   ├── workplace.ts
    │   ├── team.ts
    │   ├── home.ts
    │   └── notifications.ts
    │
    ├── hooks/
    │   ├── useAsync.ts           two-key loading model — do not simplify
    │   └── useTicker.ts          useNow, formatElapsed
    │
    ├── lib/
    │   ├── types.ts              THE CONTRACT
    │   ├── constants.ts          APP_NAME lives here
    │   ├── clock.ts              MOCK_TODAY
    │   ├── date.ts
    │   ├── auth.ts               THE AUTH SEAM
    │   ├── permissions.ts        mirror of RLS
    │   ├── labels.ts
    │   ├── home.ts
    │   └── supabase/
    │       ├── client.ts
    │       └── server.ts
    │
    └── mocks/                    (delete after swap)
        ├── index.ts
        ├── employees.ts          40 invented people
        ├── employmentRecords.ts
        ├── calendar.ts           holidays, shifts
        ├── leaveTypes.ts
        ├── documents.ts
        ├── policies.ts
        ├── notifications.ts
        ├── workplace.ts          assets, announcements, posts
        ├── attendanceAndLeave.ts the deterministic generator
        └── seed.ts               seeded PRNG
```

**Not in the archive:** `node_modules/` (run `npm install`), `.next/` (build output),
`.git/` (history is summarised in `docs/02`), `.env.local` (never committed).

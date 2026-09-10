# 11. Deployment

## Current reality

| | |
| --- | --- |
| **Live URL** | https://magppie-hr-app.vercel.app |
| **Platform** | Vercel, production target |
| **Account** | `jiyasiwach` personal — **temporary** |
| **Build** | `next build`, Turbopack, Node 22 |
| **Deploy method** | manual `npx vercel@latest --prod --yes` from a laptop |
| **CI/CD** | **none** |
| **Docker** | **none** |
| **Monitoring / logging / alerting** | **none beyond Vercel's own dashboard** |
| **Backups** | none yet — there is no database |

Nothing below is aspirational unless it says so.

## Deploying today

```bash
cd ~/Desktop/magppie-hr-app
npm install
npm run build          # must pass
npx eslint src         # must be clean
npx vercel@latest --prod --yes
```

The CLI is already authenticated as `jiyasiwach` on the original development machine. On
a fresh machine, `npx vercel login` first.

## Environment variables on Vercel

Not yet set, because the app is still on mock data. Before the Supabase wiring ships,
add to **Project → Settings → Environment Variables** for Production *and* Preview:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Both are public by design. Do **not** add a service-role key.

## Moving to the Magppie account — the one thing worth doing

Both the repo and the deployment sit on a personal account. **Transferring the repo fixes
both:**

1. GitHub → `jiyasiwach/magppie-hr-app` → Settings → Danger Zone → **Transfer ownership**
   → `Magppie1234`. Accept as `Magppie1234`.
2. Update the local remote:
   ```bash
   git remote set-url origin https://github.com/Magppie1234/magppie-hr-app.git
   ```
3. Vercel → *Magppie Silverstone Pvt Ltd* team → **Add New Project** → import
   `Magppie1234/magppie-hr-app`. Their GitHub app already reaches that org.
4. Set the two env vars on the new project; deploy; then delete the personal project so
   there is one production URL, not two.

After that, **every push to `main` deploys automatically** and the manual CLI step goes
away.

## Domains and SSL

Currently the default `*.vercel.app` domain with Vercel-managed TLS. No custom domain.
When one is wanted — say `people.mymagppie.com` — add it on the Vercel project, create the
DNS record Vercel gives you, and add the new origin to Supabase **Authentication → URL
Configuration** or Google sign-in will fail on it.

## Build configuration

- `next.config.ts` — default, no custom config
- `tsconfig.json` — strict, `@/*` → `src/*`
- Node 22 (Vercel default at time of writing)
- Build output: static prerender for every route except `/directory/[id]`, which is
  server-rendered on demand

## Proposed CI (does not exist)

A minimal, honest starting point — nothing more than what is already run by hand:

```yaml
# .github/workflows/ci.yml — NOT PRESENT, proposed
name: ci
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx eslint src
      - run: npx tsc --noEmit
      - run: npm run build
```

Add tests to it once any exist.

## Database deployment (when the project exists)

Migrations are plain SQL in `supabase/migrations/`, numbered and ordered. Apply with
`supabase db push`, or paste them into the SQL editor in order. They are written to be
idempotent where it is cheap (`on conflict do nothing` on reference data) but the schema
files are **not** re-runnable — they create types and tables unconditionally.

**Before any production data exists**, run the Supabase advisors and fix what they raise.

## Backups (to configure)

Supabase Pro includes daily backups and point-in-time recovery. For an HR database:
- turn PITR on
- decide a retention period — an employment-law question, not a technical one
- test a restore before real data is loaded, not after

## Rollback

Vercel keeps every deployment; promote a previous one from the dashboard. Database
rollback is *not* symmetric — a migration that drops or alters a column loses data. Write
migrations forward-only and never edit an applied one.

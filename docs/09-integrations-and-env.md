# 9. Integrations & Environment Configuration

## Integrations at a glance

| Service | Purpose | Status |
| --- | --- | --- |
| **Supabase** | Postgres, auth, RLS, RPC | Designed. **Project not created.** |
| **Google Workspace (OAuth)** | The only sign-in method | Chosen, **not configured** |
| **Vercel** | Hosting | **Live**, manual CLI deploys |
| **GitHub** | Source | **Live**, public repo |
| **Google Fonts** | Inter, self-hosted at build by `next/font` | Working. No runtime call. |

There are **no** webhooks, no payment provider, no email/SMS provider, no analytics, no
error tracking, and no file storage configured. Where the app would need one, it says so
on screen instead of pretending.

---

## Supabase

- **Org:** `Magppie1234's Org` (`jghwfbjzeqvqifpcutzb`)
- **Intended project:** `magppie-hr-prod`, region `ap-southeast-1` (Singapore)
- **Existing, unrelated project:** `clarity-desk-prod` — shared by several other Magppie
  apps by table prefix. **Do not put HR tables there**; a partner portal shares its keys.

### Setup
1. Dashboard → **New project** → org `Magppie1234's Org`, name `magppie-hr-prod`,
   region **Southeast Asia (Singapore)**. Save the database password in a password
   manager; it is not needed by the app.
2. Apply migrations in order — `0001_schema.sql`, `0002_rls.sql`, `0003_functions.sql`,
   `0004_reference_data.sql` — via the SQL editor or `supabase db push`.
3. Project Settings → API → copy the **Project URL** and the **anon / publishable key**
   into `.env.local`.
4. Run the Supabase advisors (security + performance) and fix what they flag.
5. Configure Google OAuth (below).

### Keys
Only the **anon / publishable** key is ever used, in the browser and on the server, so
every query is subject to RLS. **There is deliberately no service-role key in this
project.** In a Next.js app a service key is one careless import away from the browser,
and nothing here needs to bypass RLS.

---

## Google Workspace SSO

**Not configured.** Needs a Google Workspace admin — this cannot be done from the repo.

1. **Google Cloud Console** → the project for the `mymagppie.com` Workspace →
   *APIs & Services → Credentials → Create OAuth client ID → Web application*.
2. **Authorised redirect URI** — exactly one, pointing at Supabase, not at the app:
   ```
   https://<PROJECT_REF>.supabase.co/auth/v1/callback
   ```
3. Scopes: `openid`, `email`, `profile`. Nothing more — the app reads no Google data.
4. **Supabase → Authentication → Providers → Google**: paste the client ID and secret,
   enable.
5. **Supabase → Authentication → URL Configuration**:
   - Site URL: `https://magppie-hr-app.vercel.app`
   - Additional redirect URLs: `http://localhost:3040/**`, and the Vercel preview pattern
     if previews are used.
6. Restrict to the workspace domain: on the OAuth consent screen set **Internal**, and
   additionally check `email` domain in the `link_auth_user_to_employee()` trigger if you
   want defence in depth. Today the trigger only matches on an existing `work_email`,
   which already means an outsider signing in gets a session with **no employee record**
   and therefore sees nothing.

⚠️ **Open question:** factory and site staff may not have Google Workspace accounts. SSO
was chosen on the assumption they do. If they do not, a second method is needed and that
is a product decision, not a code change.

---

## Vercel

- **Live:** `https://magppie-hr-app.vercel.app` (production)
- **Account:** `jiyasiwach` personal — **temporary**, should move to
  *Magppie Silverstone Pvt Ltd*
- **Deploy:** `npx vercel@latest --prod --yes` from the project root
- No git integration: the Magppie team's GitHub app can only see the `Magppie1234` org
  and the repo currently sits under `jiyasiwach`
- **Environment variables must be set in Vercel** (Project → Settings → Environment
  Variables) before the Supabase wiring goes live — the two `NEXT_PUBLIC_*` values below.

---

## Environment configuration

### `.env.example` (in the repo)

```bash
# Supabase — magppie-hr-prod (Magppie1234's Org, ap-southeast-1)
# Copy to .env.local and fill in from the Supabase dashboard:
#   Project Settings -> API
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# There is deliberately no service-role key here. Nothing in this app needs to
# bypass row-level security, and a service key in a Next.js project is one
# careless import away from being shipped to the browser.
```

### Variables

| Variable | Required | Where it is used | What it contains |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes, once wired | `src/lib/supabase/{client,server}.ts` | `https://<PROJECT_REF>.supabase.co`. Not a secret — it ships to the browser. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes, once wired | same | The anon / publishable key. Public by design; safe **only because RLS is correct**. Rotate if RLS is ever found open. |

**Not required, and deliberately absent:** `SUPABASE_SERVICE_ROLE_KEY`, any Google client
secret (it lives in Supabase, never in the app), any database password.

### Local setup
```bash
cp .env.example .env.local
# fill in both values
npm install
npm run dev -- -p 3040
```
Until the values are filled in the app still runs — it is on mock data and never
constructs a Supabase client. `createClient()` throws a clear, actionable message if
called without configuration.

### Secret handling rules for this project
- `.env.local` and `.env*.local` are git-ignored. Never commit a filled `.env`.
- Never paste a Supabase access token, service-role key or OAuth secret into a chat,
  an issue, or a commit message.
- The repository is **public**. Treat everything in it as world-readable — it has been
  scanned and contains no credentials.

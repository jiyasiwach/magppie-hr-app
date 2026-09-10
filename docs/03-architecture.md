# 3. Architecture

## Layers

```
┌─────────────────────────────────────────────────────────────┐
│ src/app/**            Routes. 'use client'. No data logic.  │
├─────────────────────────────────────────────────────────────┤
│ src/components/**     Presentation + local form state.      │
├─────────────────────────────────────────────────────────────┤
│ src/data/*.ts         THE SWAP POINT. All async.            │
├─────────────────────────────────────────────────────────────┤
│ src/data/store.ts     In-memory mock store (to be deleted)  │
│ src/mocks/*           Mock records (to be deleted)          │
└─────────────────────────────────────────────────────────────┘
                          ▼ replaced by
┌─────────────────────────────────────────────────────────────┐
│ Supabase: Postgres + RLS + RPC  (designed, not applied)     │
└─────────────────────────────────────────────────────────────┘
```

**The contract between layers**
- Screens never import record data from `src/mocks`
- Screens never reshape a record — joins and derivations live in `src/data`
- Every `src/data` function is `async` and keeps its signature across the swap
- Every read goes through `useAsync`, which supplies loading / error / ready

## Rendering model

Almost every component is `'use client'`. That is a consequence of the data currently
living in browser memory, not a considered preference. When Supabase lands, read-heavy
screens can move to server components; the data layer's async signatures already allow it.

`src/app/layout.tsx` is the only server component of substance. It loads the font, sets
metadata from `APP_NAME`, and mounts `<AppShell>`, which itself mounts
`<CurrentUserProvider>`.

## State

There is no state library and none is needed.

| Kind | Where |
| --- | --- |
| Current user | `CurrentUserProvider` (React context), fed by `getCurrentUser()` |
| Server-ish data | `useAsync` per component, keyed on its dependencies |
| Cache invalidation | `src/data/store.ts` version counter + `subscribe()` |
| Form state | local `useState` in the form component |
| Filter / tab state | local `useState`, or the URL query for `/me?tab=` and `/wall?wish=` |

## The store version mechanism (mock-only)

`src/data/store.ts` keeps an integer `version`. Every `write()` bumps it and notifies
subscribers. `useAsync` subscribes, and a bump causes a refetch **without** dropping to
`loading` — see AI_MEMORY §5. When Supabase replaces the store, this becomes either
Supabase Realtime or plain refetch-on-mutation; the `useAsync` contract does not change.

## Directory map

| Path | Contains |
| --- | --- |
| `src/app/` | Routes (App Router), one `page.tsx` + optional `*.module.css` each |
| `src/components/ui/` | Shared primitives + the icon set. One barrel export. |
| `src/components/shell/` | Top bar, drawer, nav, colleague search, current-user provider |
| `src/components/<domain>/` | Domain components: attendance, leave, requests, documents, assets, directory, home |
| `src/data/` | The swap layer, one file per domain |
| `src/hooks/` | `useAsync`, `useTicker` (`useNow`, `formatElapsed`) |
| `src/lib/` | `types` (the contract), `auth`, `permissions`, `labels`, `date`, `clock`, `constants`, `home` |
| `src/lib/supabase/` | Browser and server Supabase clients |
| `src/mocks/` | Mock records + the deterministic generator |
| `supabase/migrations/` | Schema, RLS, functions, reference data |
| `docs/` | This handover package |

## Key module responsibilities

- **`src/lib/types.ts`** — the single data contract. Fifteen shapes from the brief plus
  `Policy`, `PolicyAcknowledgement`, `Shift`, `PostReaction`, `PostComment`. If a shape
  changes, it changes here first.
- **`src/lib/permissions.ts`** — every "can this person see/do X" predicate. The database
  mirrors these as RLS policies. **Keep the two in step.**
- **`src/lib/auth.ts`** — the auth seam and the role derivation that must not survive to
  production.
- **`src/lib/labels.ts`** — every enum → human label and enum → colour tone map. No
  component hardcodes a status string.
- **`src/lib/date.ts`** — all calendar-day maths on `YYYY-MM-DD` strings, deliberately
  avoiding `Date` arithmetic and its timezone traps.
- **`src/components/requests/renderers.tsx`** — a registry keyed by request type. The
  approvals queue renders whatever is registered and knows nothing about any module. A
  new request type is added here and nowhere else.

## Why the request object is generic

Every approvable thing — leave, regularisation, work-from-home, on-duty, overtime,
partial day, asset, document, profile change, HR notice — is a `Request` row with a
`type`, a `raisedBy`, a `currentApprover`, a `status` and a JSON `payload`. The Inbox
renders it through the renderer registry. This is why adding a module later does not mean
touching the Inbox.

## Planned server architecture

Reads go straight to PostgREST through the Supabase client, filtered by RLS. Writes that
carry business rules go through the SECURITY DEFINER RPCs in `0003_functions.sql`, so a
balance debit and its attendance recomputation happen in one transaction. There is
deliberately **no service-role key** in the app.

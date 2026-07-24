# TypeRonin

**Master Your Keyboard Like a Samurai Masters the Sword.**
Discipline. Precision. Mastery.

A typing dojo built on one rule: **no corrections**. Backspace is disabled, a struck character
is final, and a missed one stands in red until the passage ends. The product is not a typing
test with a katana painted on it — the discipline is the mechanic.

## What makes it not another typing site

| | |
| --- | --- |
| **One cut, no corrections** | Backspace and Delete are refused mid-run. You stop hammering delete and start choosing each stroke. |
| **Ma (間)** | Rhythm evenness, scored 0–100 beside WPM. Measured as the spread of your keystroke intervals relative to your *own* tempo, so it is independent of speed — a steady slow hand outscores a fast erratic one. |
| **Honor** | The only currency that advances rank, weighted by the **square** of accuracy so a sloppy sprint can never out-earn a clean pass. |
| **Prose, not word salad** | Passages are sentences with rhythm, because rhythm is the thing being measured. |
| **Nine ranks** | Heimin → Shōgun, gated on Honor alone. |

## Brand

- **Mark** — a katana bent into an "S", held inside an ensō. Both are *generated geometry*, not
  hand-drawn paths: the ensō is a filled outline whose width swells and dries along the sweep
  (a stroked circle cannot taper), and the blade and grip are sampled from one continuous S
  spine, then cut at the waist — which is why they meet exactly at the guard.
  See `src/shared/components/brand-mark.tsx`.
- **Voice** — calm, disciplined, elegant, premium. A Zen dojo, not an arcade. Short declaratives,
  no hype, no exclamation marks.
- **Type** — Cinzel for headings and the wordmark; **Yu Gothic** for body and UI; JetBrains Mono
  for the typing passage and every numeral. Yu Gothic is a *system* font with no webfont licence,
  so it is requested by name and can never be self-hosted: Windows resolves `Yu Gothic UI`, macOS
  usually has no Yu Gothic at all and falls to Hiragino Kaku Gothic ProN, and everything else lands
  on Inter. The stack in `--font-sans` is ordered to make each of those a good outcome. The trainer
  stays monospace on purpose — a proportional face makes the caret and stat dials jitter.
- **Palette** — crimson, gold, and washi paper. Light and dark are both first-class; the blade
  reads from `--brand-steel` so it holds contrast on either.

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). The dojo itself is at `/dojo` and needs
no account.

```bash
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

## Layout

```
src/
  app/                    routes (App Router)
    (auth)/               login, register, forgot, reset — a shared "gate" layout
    dojo/                 the trainer, gated on an account
    admin/                the Magistrate — twenty-one modules behind permissions
    blog/                 public posts, categories, tags
  features/               one directory per domain, the unit of organisation
    typing/               KATA: passages, use-kata, kata-trainer, save action
    scroll/               SCROLL: the vocabulary game, its scoring and choices
    dojo/                 the switch between the two disciplines
    gamification/         ranks, player stats, Bushido trials, reward granting
    missions/             the standing orders, defined in code
    play/                 daily limits: games per day, cooldown, multiplier
    economy/              the Honor-to-cash rate and the money maths
    withdrawals/          payouts: the escrow model and its state machine
    profile/              handles, dashboards, public profiles, activity
    auth/                 forms, schemas, roles, permissions, login tracking
    security/             device cookie, fingerprint, session panel
    admin/                the panel: nav, guard, audit, per-module actions
    blog/                 the CMS: document tree, editor, renderer, queries
    media/                the library, and the only writer to the storage bucket
    passages/             the KATA corpus as data
    ads/                  placements and units, resolved by slug
    social/               links the site footer renders
  shared/components/      brand mark, layout furniture, sakura, shadcn primitives
  lib/                    prisma client, supabase clients, slug, cn
  proxy.ts                session refresh + device cookie (NOT authorization)
```

A domain directory follows one shape. The **pure** module (`config.ts`, `limits.ts`, `model.ts`,
`scoring.ts`) holds the rules and imports neither the database nor `server-only`, so the form, the
server action, the admin editor and the test all read one definition. `service.ts` and `queries.ts`
carry `import "server-only"` and do the reading. `actions.ts` holds the Server Actions, and each one
re-checks authorization for itself.

`features/{dashboard,inventory,leaderboard,rewards,settings}` and `src/{repositories,server,
services}` are empty placeholders from the initial scaffold. They are directories, not plans.

## Accounts and roles

Auth is Supabase, wired through `@supabase/ssr`. Copy `.env.example` to `.env.local` and set
`NEXT_PUBLIC_SUPABASE_URL` plus the publishable (or anon) key. Without them the app still builds
and the dojo still trains — the gate simply says it has nothing to talk to.

Session refresh lives in **`src/proxy.ts`**. Next 16 renamed Middleware to Proxy, so every
Supabase guide you will read says `middleware.ts` — under Next 16 that file is never invoked, and
the symptom is random logouts rather than an error. It must also live in `src/`, beside `app/`.

### Who is an admin

Authority lives in **our own tables** — a `ProfileRole` row pointing at a `Role`, which carries a
set of named `Permission`s like `blog:publish` or `payouts:write`. That is the normal path, and it
is the one an admin can grant from the panel without a deploy.

Supabase **`app_metadata.role === "admin"`** is kept as a second path, deliberately: **break glass**.
If the tables were the only route, one bad grant could lock every admin out of the very panel that
fixes grants. Neither path is forgeable by an account holder — the first needs server-side database
access, the second needs the service key.

`user_metadata` grants nothing, ever. It is writable by the account holder, so any signed-in student
could call `supabase.auth.updateUser({ data: { role: "admin" } })` and set it themselves. A role
kept there is a privilege-escalation hole, not a permission. The student's *name* lives there
precisely because nothing is gated on it.

Anything unrecognised resolves to `student`. Authorization fails **closed**: a permission that
cannot be confirmed is not granted.

#### Granting the first admin

Roles are rows, so there is no chicken-and-egg panel to sign into first. Register the account
normally, confirm its email, seed the database, then:

```bash
npx prisma db seed                                    # creates the roles and permissions
npx tsx scripts/grant-admin.ts you@example.com        # grants admin
npx tsx scripts/grant-admin.ts you@example.com --revoke
```

The script grants a role to an **existing** account and deliberately cannot create one — minting
credentials from a script is how you end up with logins nobody remembers making. It takes effect on
the next request: the role is read per request, so signing out and back in is not required.

The SQL below writes the break-glass flag instead. Reach for it when the role tables are unreachable
or a bad grant has locked everyone out — not to make an ordinary admin:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'you@example.com';
```

#### Checking authority in code

```ts
import { getStudent, requireAdmin } from "@/lib/supabase/server";
import { requirePermission, holds } from "@/features/admin/guard";

const student = await getStudent();   // null | { name, email, role }

await requireAdmin();                 // page guard: anonymous -> /login, student -> 404

const ctx = await requirePermission("payouts:write");  // the gate for a module or an action
holds(ctx, "blog:publish");                            // a second capability, same context
```

Guards belong in the page, next to what they protect — not in the proxy, which can only make an
optimistic guess from a cookie. And a page guard protects only the page: **Server Actions are public
HTTP endpoints**, so every mutation calls `requirePermission` for itself rather than trusting the
screen it was invoked from.

`/admin` ("The Magistrate") exists to prove the boundary holds: signed out it redirects to `/login`,
and a signed-in student gets a 404 rather than a locked door to rattle.

## State of things

The dojo is gated and **training is for keeps**. Accounts are wired to Supabase, the database is
real (`prisma/schema.prisma`, migrated), and a profile is minted lazily on the first authenticated
request. There are two disciplines and both earn Honor: **KATA**, the typing game, and **SCROLL**,
where a meaning is matched to its word. They answer to one shared daily limit, so the two cannot be
alternated to double a day.

What works end to end:

- **Play.** A finished run is scored on the client and **re-scored on the server** from the raw
  counts — Honor is never a number the browser reports. Daily cap, cooldown and the Honor
  multiplier are admin knobs read from the `Setting` table.
- **Progression.** Rank is resolved from Honor and a crossing lights the promotion modal.
  **Bushido Trials** and **Missions** are derived from real session history, not stored progress,
  and are paid once — the composite primary keys on `ProfileAchievement` and `MissionClaim` are the
  idempotency guard, not application code.
- **Payouts.** Honor converts to cash at an admin-set rate and leaves the balance into escrow the
  moment a withdrawal is requested. Every balance move is a conditional, atomic update; every status
  change is guarded on the states it is legal from. See `features/withdrawals/actions.ts`.
- **The Magistrate.** `/admin` carries twenty-one modules behind a database-backed role and
  permission system, with Supabase `app_metadata` kept as break glass. Blog CMS, media library,
  word and passage corpora, ad placements, devices, and the audit log are all live.

What is still demo or absent:

- **Hall of Legends** (`/leaderboard`) renders **hardcoded standings**. It is the last page that
  does. `LeaderboardSeason` and `LeaderboardEntry` exist to hold a computed cache, but nothing
  writes them yet — the rankings are derivable from `TypingSession` today, and the cache is there
  for when ranking every session on every page view stops being viable.
- **Scheduled posts do not publish themselves.** A post can be set `SCHEDULED` with a date, and
  `@@index([status, scheduledFor])` is waiting for the job that flips it. There is no such job, so
  a scheduled post stays scheduled until someone publishes it by hand.

`/privacy` and `/terms` are honest drafts and carry a visible note that they need review by
counsel before launch.

## Working in this repo

See [`AGENTS.md`](./AGENTS.md). This is Next.js 16 — read the bundled docs in
`node_modules/next/dist/docs/` before writing code; APIs and conventions differ from older
versions.
# typeronin

# Samurai Script

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
    (auth)/               login + register, share a split "gate" layout
    dojo/                 the trainer
  features/
    typing/               the engine: passages, use-kata, kata-trainer
    gamification/         the nine ranks
    auth/                 form schemas + forms
  shared/components/      brand mark, layout furniture, shadcn ui primitives
```

## Accounts and roles

Auth is Supabase, wired through `@supabase/ssr`. Copy `.env.example` to `.env.local` and set
`NEXT_PUBLIC_SUPABASE_URL` plus the publishable (or anon) key. Without them the app still builds
and the dojo still trains — the gate simply says it has nothing to talk to.

Session refresh lives in **`src/proxy.ts`**. Next 16 renamed Middleware to Proxy, so every
Supabase guide you will read says `middleware.ts` — under Next 16 that file is never invoked, and
the symptom is random logouts rather than an error. It must also live in `src/`, beside `app/`.

### Who is an admin

The role is read from Supabase **`app_metadata`**, never `user_metadata`:

- `user_metadata` is writable by the account holder — any signed-in student can call
  `supabase.auth.updateUser({ data: { role: "admin" } })`. A role kept there is a
  privilege-escalation hole, not a permission. The student's *name* lives there precisely because
  nothing is gated on it.
- `app_metadata` can only be written with the service key or by SQL.

Anything unrecognised resolves to `student`. Roles fail closed.

To grant yourself admin, run this in the Supabase dashboard → SQL Editor:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'you@example.com';
```

It takes effect on the next request — no need to sign out. `getUser()` fetches the user from the
auth server rather than trusting the cookie, so it sees the new role immediately.

To check a role in code:

```ts
import { getStudent, requireAdmin } from "@/lib/supabase/server";

const student = await getStudent();   // null | { name, email, role }
student?.role === "admin";

await requireAdmin();  // in a page: redirects anonymous -> /login, students -> 404
```

Guards belong in the page, next to what they protect — not in the proxy, which can only make an
optimistic guess from a cookie. `/admin` ("The Magistrate") exists to prove the boundary holds:
signed out it redirects to `/login`, and a signed-in student gets a 404 rather than a locked door
to rattle.

## State of things

The **dojo is fully working** — type a passage and it scores you live. The surrounding pages
(Hall of Legends, Missions, Bushido Trials) render **hardcoded demo data**: there is no database
yet (`prisma/schema.prisma` has no models) and **accounts are not wired to an identity provider**,
so `/login` and `/register` validate but cannot sign anyone in. Both auth pages say so on their
face rather than faking a success state.

`/privacy` and `/terms` are honest drafts and carry a visible note that they need review by
counsel before launch.

## Working in this repo

See [`AGENTS.md`](./AGENTS.md). This is Next.js 16 — read the bundled docs in
`node_modules/next/dist/docs/` before writing code; APIs and conventions differ from older
versions.

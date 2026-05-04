# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (see `pnpm-lock.yaml`).

- `pnpm dev` — start Next.js dev server
- `pnpm build` — production build
- `pnpm start` — run the production build
- `pnpm lint` — declared as `eslint .` but **non-functional as shipped** (eslint isn't a dependency and no `eslint.config.*` exists). Treat type-checking as the only static check until eslint is added.

There is no test runner configured.

`next.config.mjs` sets `typescript.ignoreBuildErrors: true`, so `pnpm build` will succeed even with TS errors. Run `pnpm exec tsc --noEmit` if you need real type-checking.

## Required environment

Auth and data fetching will silently break without these (read by `lib/supabase/{client,server,middleware}.ts`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Architecture

Next.js 16 App Router + React 19 + Supabase (auth + Postgres) + shadcn/ui (Radix + Tailwind v4). Path alias `@/*` resolves to repo root.

### Auth & route protection

`middleware.ts` runs on every non-static request and delegates to `lib/supabase/middleware.ts::updateSession`, which:
1. Refreshes the Supabase session cookie.
2. Redirects to `/auth/login` if there is no user **and** the path is neither `/` nor under `/auth/*`.

The comment in `updateSession` is load-bearing: do not insert code between `createServerClient(...)` and `supabase.auth.getUser()`, or sessions can be silently dropped. When adding new public routes, update both this allowlist and the `matcher` in `middleware.ts`.

There are three Supabase client factories — pick by execution context:
- `lib/supabase/client.ts` — browser (singleton, used in `"use client"` components)
- `lib/supabase/server.ts` — Server Components / Route Handlers (reads cookies via `next/headers`)
- `lib/supabase/middleware.ts` — Edge middleware only

OAuth/magic-link callback lands at `app/auth/callback/route.ts`, which exchanges the code for a session and then redirects to `?next=` (default `/dashboard`).

### Dashboard data flow

The dashboard uses a **server-fetch → client-hydrate** pattern:

- `app/dashboard/page.tsx` (Server Component) fetches `budget_categories`, `income_sources`, `bills`, `expenses` from Supabase in parallel and passes them as `initial*` props.
- `components/dashboard/dashboard-client.tsx` ("use client") owns the live state via `useState` and passes `set*` updaters down to each card.
- Mutating cards (`bills-card`, `income-card`, `expenses-card`, `budget-categories-card`) write to Supabase via the **browser client** and update local state optimistically. They also call `onRefresh()` → `router.refresh()` to re-run the server fetch.

Derived totals (monthly income normalization across `weekly`/`bi-weekly`/`monthly`/`annually`, current-month expense filtering, unpaid-bill totals) are computed in `dashboard-client.tsx` — keep that math there rather than scattering it into card components.

### Domain model

Defined in `lib/types.ts`. Supabase tables mirror these names:

- `budget_categories` — user-defined spending buckets with `budget_limit` and `color`
- `income_sources` — recurring income with a `frequency` enum
- `bills` — `category_id` FK to `budget_categories`; queries embed the category via `select("*, category:budget_categories(*)")`
- `expenses` — `category_id` FK; may also link to a `bill_id` (paying a bill creates an expense)

All tables have `user_id`. The dashboard fetch in `app/dashboard/page.tsx` filters every `select` by `.eq("user_id", user.id)` and every card mutation passes `user_id: userId` on insert — defense in depth on top of RLS, not a substitute for it. Keep this pattern when adding new tables or queries.

### UI conventions

- shadcn/ui configured in `components.json` (style `new-york`, base color `neutral`, RSC on, icon library `lucide`). Use the CLI to add primitives; they land in `components/ui/`.
- Tailwind v4 via `@tailwindcss/postcss` — no `tailwind.config.*`; tokens live in `app/globals.css`.
- Theming wrapper exists at `components/theme-provider.tsx` (next-themes) but is not currently mounted in `app/layout.tsx`.
- Forms: `react-hook-form` + `zod` via `@hookform/resolvers`. Charts: `recharts`. Toasts: both `sonner` and the older `components/ui/toast.tsx` exist — prefer `sonner`.

## Project agents

- **`code-quality-reviewer`** (defined in `.claude/agents/code-quality-reviewer.md`, model: sonnet) — run via the `Agent` tool with `subagent_type: "code-quality-reviewer"` after finishing a logical chunk of work, before committing, or whenever the user asks for a review. Scope it to *recently changed* code, not the whole repo. It returns a punch list grouped by severity (correctness, security, type safety, anti-patterns); fold those findings back into edits before reporting the task done.

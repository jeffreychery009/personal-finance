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
- `AI_GATEWAY_API_KEY` — read by `app/api/goals/insights/route.ts` via the `ai` package's default Vercel AI Gateway provider

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

### Pages & data flow

Both authenticated pages use the same **server-fetch → client-hydrate** pattern:

- **`/dashboard`** (`app/dashboard/page.tsx` → `dashboard-client.tsx`) — fetches `budget_categories`, `income_sources`, `bills`, `expenses` in parallel.
- **`/net-worth`** (`app/net-worth/page.tsx` → `components/net-worth/net-worth-client.tsx`) — fetches `assets`, `debts` in parallel.

The Server Component does parallel `Promise.all` selects filtered by `user_id` and passes results as `initial*` props. The client component owns live state via `useState` and passes `set*` updaters to each card. Mutating cards write to Supabase via the **browser client**, update local state optimistically, then call `onRefresh()` → `router.refresh()`.

Derived totals (monthly income normalization across `weekly`/`bi-weekly`/`monthly`/`annually`, current-month expense filtering, unpaid-bill totals) are computed in `dashboard-client.tsx`; net-worth/utilization math lives in `net-worth-overview.tsx` and `debts-card.tsx`. Keep math at that layer rather than in individual list rows.

`components/dashboard/dashboard-header.tsx` is the **shared header** for both pages — it renders nav links keyed off `usePathname()`. Add new top-level routes there.

### Domain model

Defined in `lib/types.ts`. Supabase tables mirror these names:

- `budget_categories` — user-defined spending buckets with `budget_limit` and `color`
- `income_sources` — recurring income with a `frequency` enum
- `bills` — `category_id` FK to `budget_categories`; queries embed the category via `select("*, category:budget_categories(*)")`
- `expenses` — `category_id` FK; may also link to a `bill_id` (paying a bill creates an expense)
- `assets` — net-worth items with a `type` enum (`cash`/`investment`/`real_estate`/`vehicle`/`other`)
- `debts` — net-worth items with a `kind` enum (`credit_card`/`loan`); credit cards also carry `apr` and `credit_limit` (utilization = `balance / credit_limit`)

All tables have `user_id`. The dashboard fetch in `app/dashboard/page.tsx` filters every `select` by `.eq("user_id", user.id)` and every card mutation passes `user_id: userId` on insert — defense in depth on top of RLS, not a substitute for it. Keep this pattern when adding new tables or queries.

### UI conventions

- shadcn/ui configured in `components.json` (style `new-york`, base color `neutral`, RSC on, icon library `lucide`). Use the CLI to add primitives; they land in `components/ui/`.
- Tailwind v4 via `@tailwindcss/postcss` — no `tailwind.config.*`; tokens live in `app/globals.css`.
- Theming wrapper exists at `components/theme-provider.tsx` (next-themes) but is not currently mounted in `app/layout.tsx`.
- Forms: `react-hook-form` + `zod` via `@hookform/resolvers`. Charts: `recharts`. Toasts: prefer `sonner` — the `<Toaster />` is mounted in `app/layout.tsx`. The older `components/ui/toast.tsx` exists but should not be used. For destructive actions (deletes), use a sonner toast with `action`/`cancel` buttons as a confirmation prompt — see `components/net-worth/{assets,debts}-card.tsx` for the pattern.
- **Dates: always use `<DatePicker>` from `components/ui/date-picker.tsx`** (a shadcn Popover + Calendar wrapper). Never use `<Input type="date">` — the native picker doesn't match the rest of the UI. Form state should be `Date | undefined`; convert at the Supabase boundary with `dateToISO(date)` (writes) and `dateFromISO(row.field)` (reads), both exported from the same file. Those helpers parse `"YYYY-MM-DD"` as local time to avoid the UTC-midnight off-by-one.

## Project agents

- **`code-quality-reviewer`** (defined in `.claude/agents/code-quality-reviewer.md`, model: sonnet) — run via the `Agent` tool with `subagent_type: "code-quality-reviewer"` after finishing a logical chunk of work, before committing, or whenever the user asks for a review. Scope it to *recently changed* code, not the whole repo. It returns a punch list grouped by severity (correctness, security, type safety, anti-patterns); fold those findings back into edits before reporting the task done.

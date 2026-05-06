---
name: Stable Playwright selectors for the auth flows
description: Reliable accessible names/labels for login, sign-up, and the sign-out dropdown. Targets that survive cosmetic changes.
type: project
---

Form fields on `/auth/login` and `/auth/sign-up` use shadcn `<Label htmlFor="...">` + `<Input id="...">`, so role-based label queries work cleanly:

- Email input → `page.getByLabel("Email")`
- Password input → `page.getByLabel("Password")`

Submit buttons (button text changes between idle/loading states):

- Login → `page.getByRole("button", { name: "Sign in" })` (loading state is "Signing in...")
- Sign-up → `page.getByRole("button", { name: "Create account" })` (loading state is "Creating account...")

Page identity (note: the headings are shadcn `CardTitle` divs, not headings — see `shadcn-card-title.md`):

- Login → `page.getByText("Welcome back", { exact: true })`
- Sign-up → `page.getByText("Create an account", { exact: true })`
- Sign-up success → `page.getByText("Check your email", { exact: true })` and `page.getByRole("link", { name: "Back to login" })`

Sign-out lives in the `DashboardHeader` user dropdown:

1. The trigger button has the user's email as its visible label (hidden on small screens but still accessible). Use `page.getByRole("button", { name: <userEmail> })` to open it.
2. Inside the Radix dropdown, the sign-out target is `page.getByRole("menuitem", { name: "Sign out" })`.
3. After click, the client calls `supabase.auth.signOut()` then `router.push("/auth/login")`. The next `/dashboard` request will be redirected back to login by the middleware.

Inline error messages on auth pages render as `<p class="text-sm text-destructive">{error.message}</p>`. To capture an error string, use `page.locator("p.text-destructive").textContent()`.

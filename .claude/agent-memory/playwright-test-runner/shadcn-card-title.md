---
name: shadcn CardTitle is a div
description: shadcn `CardTitle` renders as a `div`, not a heading element, so role-based heading queries miss it.
type: project
---

`components/ui/card.tsx` defines `CardTitle` as `React.ComponentProps<'div'>` with `<div data-slot="card-title">`. The auth pages (login, sign-up, sign-up-success) use `<CardTitle>` for "Welcome back", "Create an account", and "Check your email".

**Why:** This is the upstream shadcn "new-york" style default, not an oversight in the app. It's not going to change unless the team adopts a heading variant.

**How to apply:** When asserting these screens are rendered, use `page.getByText("Welcome back", { exact: true })` instead of `page.getByRole("heading", { name: "Welcome back" })`. The same applies to any other shadcn `CardTitle` usage in the app.

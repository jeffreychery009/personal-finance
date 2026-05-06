---
name: Supabase signup rate limit fires quickly during e2e runs
description: Running the sign-up test more than a few times per hour produces "email rate limit exceeded" — handle as a soft skip, not a failure.
type: project
---

Supabase enforces an outgoing-email rate limit per project (default ~4/hour on the free tier, configurable in the dashboard). The sign-up endpoint sends a confirmation email on every successful registration, so repeated test runs will trip it. The error renders inline on `/auth/sign-up` as `email rate limit exceeded`.

**Why:** The limit is a project-level quota, not a bug. Failing the test for hitting it would mean the suite goes red on benign back-to-back runs.

**How to apply:** In the sign-up Playwright test, after submitting the form, branch on the resulting URL:
- `/auth/sign-up-success` → success path (expected when confirmation is on)
- `/dashboard` → success path (auto-confirm)
- still on `/auth/sign-up` with a `p.text-destructive` → read the message; if it matches `/rate limit/i`, `test.skip(...)` with a clear note. Any other error is a real failure.

If you need to push past the limit, raise the quota in the Supabase dashboard under Authentication → Rate Limits, or wait an hour.

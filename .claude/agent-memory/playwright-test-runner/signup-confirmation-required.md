---
name: Supabase email confirmation is enabled — sign-up does not auto-login
description: The configured Supabase project requires email confirmation, so freshly registered users cannot immediately sign in.
type: project
---

After a successful POST to `supabase.auth.signUp`, the app redirects to `/auth/sign-up-success` which renders "We've sent you a confirmation link." The user is in a pending state until the link is clicked.

**Why:** This is the project's auth setting in Supabase Dashboard → Authentication → Settings → "Confirm email" (currently on). The success page exists specifically to communicate this gate.

**How to apply:**
- The login test cannot reuse a freshly signed-up account from the same run — `signInWithPassword` will fail with "Email not confirmed" until the email link is clicked.
- For the login + sign-out tests, require a pre-confirmed test user via `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` env vars; skip those tests when the vars are unset.
- If you ever need to bypass this for tests, the only sane options are: (a) toggle confirmation off in Supabase for a dedicated test project, or (b) admin-confirm via the service-role key — never with the anon key the app uses.

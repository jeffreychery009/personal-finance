---
name: Supabase project rejects @example.com on sign-up
description: This Supabase project's email validator rejects `@example.com` (and likely other reserved/invalid TLDs) with "Email address ... is invalid".
type: project
---

The Supabase project at `https://jpljakgniukwqgxbtgwu.supabase.co` (the one wired into `.env.local`) refuses sign-ups with `@example.com`. The error rendered inline on `/auth/sign-up` is `Email address "<addr>" is invalid`.

**Why:** Supabase Auth has built-in checks against RFC 2606 reserved domains (`example.com`, `test.com`, etc.) and may also have a project-level domain blocklist. This is a server-side decision — no amount of client-side massaging changes it.

**How to apply:** Synthetic addresses for the sign-up flow should default to a domain that passes validation. `mailinator.com` works. Allow override via `E2E_TEST_EMAIL_DOMAIN`. Never use `@example.com` or `@test.com` as the unique-email domain.

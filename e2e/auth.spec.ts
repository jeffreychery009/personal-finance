import { test, expect, type Page } from "@playwright/test"

/**
 * Auth flows for the personal-finance app:
 *   1. Login   — existing user signs in and reaches /dashboard
 *   2. Sign up — new user submits valid credentials and lands on /auth/sign-up-success
 *   3. Sign out — authenticated user signs out and returns to /auth/login
 *
 * Existing-user credentials come from env:
 *   E2E_TEST_EMAIL, E2E_TEST_PASSWORD
 * If they're missing, the login + sign-out tests are skipped (signup still runs).
 */

const TEST_EMAIL = process.env.E2E_TEST_EMAIL
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD

function uniqueEmail() {
  // Local-part timestamp + random suffix — one fresh address per run.
  // The Supabase project rejects @example.com (and other invalid-domain
  // addresses) as "invalid", so we default to a domain that passes its
  // validation. Override with E2E_TEST_EMAIL_DOMAIN if a different
  // throwaway domain works for your project.
  const stamp = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  const domain = process.env.E2E_TEST_EMAIL_DOMAIN ?? "mailinator.com"
  return `e2e-${stamp}-${rand}@${domain}`
}

async function fillAuthForm(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
}

test.describe("auth", () => {
  test.beforeEach(async ({ context }) => {
    // Each test starts with no Supabase session — the previous test's sign-out
    // should have cleared cookies, but be defensive.
    await context.clearCookies()
  })

  test("middleware redirects unauthenticated /dashboard request to /auth/login", async ({
    page,
  }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/auth\/login$/)
    await expect(page.getByText("Welcome back", { exact: true })).toBeVisible()
  })

  test("sign-up flow: new email + password lands on /auth/sign-up-success", async ({
    page,
  }) => {
    const email = uniqueEmail()
    const password = "Test123456!"

    await page.goto("/auth/sign-up")
    await expect(
      page.getByText("Create an account", { exact: true })
    ).toBeVisible()

    await fillAuthForm(page, email, password)
    await page.getByRole("button", { name: "Create account" }).click()

    // Three possible outcomes:
    //  - /auth/sign-up-success — email confirmation is enabled (expected)
    //  - /dashboard            — auto-confirm enabled
    //  - stays on /auth/sign-up with a Supabase error rendered inline
    //    (e.g. "email rate limit exceeded" — a project-level constraint
    //    that fires when many signups happen in a short window)
    await Promise.race([
      page
        .waitForURL(/\/auth\/sign-up-success|\/dashboard/, { timeout: 15_000 })
        .catch(() => null),
      page
        .locator("p.text-destructive")
        .waitFor({ state: "visible", timeout: 15_000 })
        .catch(() => null),
    ])

    const url = page.url()
    if (url.includes("sign-up-success")) {
      await expect(
        page.getByText("Check your email", { exact: true })
      ).toBeVisible()
      await expect(
        page.getByRole("link", { name: "Back to login" })
      ).toBeVisible()
    } else if (url.includes("/dashboard")) {
      await expect(page).toHaveURL(/\/dashboard/)
    } else {
      const errorLocator = page.locator("p.text-destructive")
      const errorMessage = (await errorLocator.textContent())?.trim() ?? ""
      // Rate limit is a Supabase project quota — treat it as a soft skip so
      // we can still validate the rest of the suite. Any other error is a
      // real failure (invalid email/password rejection, server error, etc).
      test.skip(
        /rate limit/i.test(errorMessage),
        `Supabase rate limit hit during sign-up: "${errorMessage}". Wait an hour or use a different project.`
      )
      throw new Error(`Sign-up rejected by Supabase: "${errorMessage}"`)
    }
  })

  test("login flow: existing user reaches /dashboard", async ({ page }) => {
    test.skip(
      !TEST_EMAIL || !TEST_PASSWORD,
      "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to run the login test against a confirmed Supabase user."
    )

    await page.goto("/auth/login")
    await expect(page.getByText("Welcome back", { exact: true })).toBeVisible()

    await fillAuthForm(page, TEST_EMAIL!, TEST_PASSWORD!)
    await page.getByRole("button", { name: "Sign in" }).click()

    await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
    await expect(page).toHaveURL(/\/dashboard/)

    // Confirm the dashboard chrome rendered — the header has nav links to
    // Dashboard, Net Worth, and Goals.
    await expect(
      page.getByRole("link", { name: "Dashboard" })
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Net Worth" })
    ).toBeVisible()
  })

  test("sign-out flow: authenticated user signs out and returns to /auth/login", async ({
    page,
  }) => {
    test.skip(
      !TEST_EMAIL || !TEST_PASSWORD,
      "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to run the sign-out test."
    )

    // 1) Sign in.
    await page.goto("/auth/login")
    await fillAuthForm(page, TEST_EMAIL!, TEST_PASSWORD!)
    await page.getByRole("button", { name: "Sign in" }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 })

    // 2) Open the user dropdown in the dashboard header.
    //    The trigger is a Button with the user's email and a User icon.
    //    Targeting by accessible name (the email) is the most stable selector.
    const userTrigger = page.getByRole("button", { name: TEST_EMAIL! })
    await expect(userTrigger).toBeVisible()
    await userTrigger.click()

    // 3) Click "Sign out" inside the Radix DropdownMenu.
    await page.getByRole("menuitem", { name: "Sign out" }).click()

    // 4) Verify we're back at /auth/login (router.push happens after signOut).
    await page.waitForURL(/\/auth\/login/, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/auth\/login/)
    await expect(page.getByText("Welcome back", { exact: true })).toBeVisible()

    // 5) Confirm the session is actually gone — middleware should redirect
    //    a fresh /dashboard request back to /auth/login.
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})

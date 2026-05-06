import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing env. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
  )
  process.exit(1)
}

const email = process.env.E2E_TEST_EMAIL ?? "testuser1@example.com"
const password = process.env.E2E_TEST_PASSWORD ?? "test123!"

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: list, error: listErr } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
})
if (listErr) {
  console.error("listUsers failed:", listErr.message)
  process.exit(1)
}

const existing = list.users.find((u) => u.email === email)

if (existing) {
  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  })
  if (error) {
    console.error("updateUserById failed:", error.message)
    process.exit(1)
  }
  console.log(`Updated existing user: ${email} (id=${existing.id})`)
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) {
    console.error("createUser failed:", error.message)
    process.exit(1)
  }
  console.log(`Created user: ${email} (id=${data.user.id})`)
}

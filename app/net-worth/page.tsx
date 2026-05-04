import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NetWorthClient } from "@/components/net-worth/net-worth-client"
import type { Asset, Debt } from "@/lib/types"

export default async function NetWorthPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const [assetsRes, debtsRes] = await Promise.all([
    supabase
      .from("assets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("debts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ])

  for (const [name, res] of [
    ["assets", assetsRes],
    ["debts", debtsRes],
  ] as const) {
    if (res.error) console.error(`[net-worth] failed to load ${name}:`, res.error)
  }

  const assets: Asset[] = assetsRes.data ?? []
  const debts: Debt[] = debtsRes.data ?? []

  return (
    <NetWorthClient
      initialAssets={assets}
      initialDebts={debts}
      userId={user.id}
      userEmail={user.email || ""}
    />
  )
}

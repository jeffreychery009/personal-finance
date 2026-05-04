"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Asset, Debt } from "@/lib/types"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { NetWorthOverview } from "./net-worth-overview"
import { AssetsCard } from "./assets-card"
import { DebtsCard } from "./debts-card"

interface NetWorthClientProps {
  initialAssets: Asset[]
  initialDebts: Debt[]
  userId: string
  userEmail: string
}

export function NetWorthClient({
  initialAssets,
  initialDebts,
  userId,
  userEmail,
}: NetWorthClientProps) {
  const [assets, setAssets] = useState(initialAssets)
  const [debts, setDebts] = useState(initialDebts)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const refreshData = () => {
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userEmail={userEmail} onSignOut={handleSignOut} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <NetWorthOverview assets={assets} debts={debts} />

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <AssetsCard
            assets={assets}
            setAssets={setAssets}
            userId={userId}
            onRefresh={refreshData}
          />
          <DebtsCard
            debts={debts}
            setDebts={setDebts}
            userId={userId}
            onRefresh={refreshData}
          />
        </div>
      </main>
    </div>
  )
}

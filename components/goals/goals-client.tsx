"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Goal } from "@/lib/types"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { GoalsOverview } from "./goals-overview"
import { GoalsCard } from "./goals-card"
import { GoalsInsights } from "./goals-insights"

interface GoalsClientProps {
  initialGoals: Goal[]
  userId: string
  userEmail: string
}

export function GoalsClient({ initialGoals, userId, userEmail }: GoalsClientProps) {
  const [goals, setGoals] = useState(initialGoals)
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
        <GoalsOverview goals={goals} />

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <GoalsCard
            goals={goals}
            setGoals={setGoals}
            userId={userId}
            onRefresh={refreshData}
          />
          <GoalsInsights goals={goals} />
        </div>
      </main>
    </div>
  )
}

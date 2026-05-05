import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { GoalsClient } from "@/components/goals/goals-client"
import type { Goal } from "@/lib/types"

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const goalsRes = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (goalsRes.error) console.error("[goals] failed to load goals:", goalsRes.error)

  const goals: Goal[] = goalsRes.data ?? []

  return (
    <GoalsClient
      initialGoals={goals}
      userId={user.id}
      userEmail={user.email || ""}
    />
  )
}

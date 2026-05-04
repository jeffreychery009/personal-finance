import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import type { BudgetCategory, IncomeSource, Bill, Expense } from "@/lib/types"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const [categoriesRes, incomeRes, billsRes, expensesRes] = await Promise.all([
    supabase
      .from("budget_categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("income_sources")
      .select("*")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("bills")
      .select("*, category:budget_categories(*)")
      .eq("user_id", user.id)
      .order("due_date"),
    supabase
      .from("expenses")
      .select("*, category:budget_categories(*)")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
  ])

  for (const [name, res] of [
    ["budget_categories", categoriesRes],
    ["income_sources", incomeRes],
    ["bills", billsRes],
    ["expenses", expensesRes],
  ] as const) {
    if (res.error) console.error(`[dashboard] failed to load ${name}:`, res.error)
  }

  const categories: BudgetCategory[] = categoriesRes.data ?? []
  const incomeSources: IncomeSource[] = incomeRes.data ?? []
  const bills: Bill[] = billsRes.data ?? []
  const expenses: Expense[] = expensesRes.data ?? []

  return (
    <DashboardClient
      initialCategories={categories}
      initialIncomeSources={incomeSources}
      initialBills={bills}
      initialExpenses={expenses}
      userId={user.id}
      userEmail={user.email || ""}
    />
  )
}

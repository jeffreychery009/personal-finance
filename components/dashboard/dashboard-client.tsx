"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { BudgetCategory, IncomeSource, Bill, Expense } from "@/lib/types"
import { DashboardHeader } from "./dashboard-header"
import { OverviewCards } from "./overview-cards"
import { BudgetCategoriesCard } from "./budget-categories-card"
import { BillsCard } from "./bills-card"
import { IncomeCard } from "./income-card"
import { ExpensesCard } from "./expenses-card"
import { SpendingChart } from "./spending-chart"

interface DashboardClientProps {
  initialCategories: BudgetCategory[]
  initialIncomeSources: IncomeSource[]
  initialBills: Bill[]
  initialExpenses: Expense[]
  userId: string
  userEmail: string
}

// Average payments per month, accounting for the 52.143-week year.
const WEEKLY_PER_MONTH = 52 / 12
const BIWEEKLY_PER_MONTH = 26 / 12

function monthlyEquivalent(source: IncomeSource): number {
  switch (source.frequency) {
    case "weekly":
      return source.amount * WEEKLY_PER_MONTH
    case "bi-weekly":
      return source.amount * BIWEEKLY_PER_MONTH
    case "annually":
      return source.amount / 12
    default:
      return source.amount
  }
}

export function DashboardClient({
  initialCategories,
  initialIncomeSources,
  initialBills,
  initialExpenses,
  userId,
  userEmail,
}: DashboardClientProps) {
  const [categories, setCategories] = useState(initialCategories)
  const [incomeSources, setIncomeSources] = useState(initialIncomeSources)
  const [bills, setBills] = useState(initialBills)
  const [expenses, setExpenses] = useState(initialExpenses)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const refreshData = () => {
    router.refresh()
  }

  const totalMonthlyIncome = incomeSources.reduce(
    (sum, source) => sum + monthlyEquivalent(source),
    0
  )

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const monthlyExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.date)
    return (
      expenseDate.getMonth() === currentMonth &&
      expenseDate.getFullYear() === currentYear
    )
  })

  const totalMonthlyExpenses = monthlyExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  )

  const unpaidBills = bills.filter((bill) => !bill.is_paid)
  const totalUnpaidBills = unpaidBills.reduce((sum, bill) => sum + bill.amount, 0)

  const remainingBudget = totalMonthlyIncome - totalMonthlyExpenses - totalUnpaidBills

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userEmail={userEmail} onSignOut={handleSignOut} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <OverviewCards
          totalIncome={totalMonthlyIncome}
          totalExpenses={totalMonthlyExpenses}
          unpaidBills={totalUnpaidBills}
          remainingBudget={remainingBudget}
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <BudgetCategoriesCard
            categories={categories}
            expenses={monthlyExpenses}
            setCategories={setCategories}
            userId={userId}
            onRefresh={refreshData}
          />
          <SpendingChart categories={categories} expenses={monthlyExpenses} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <BillsCard
            bills={bills}
            categories={categories}
            setBills={setBills}
            setExpenses={setExpenses}
            userId={userId}
            onRefresh={refreshData}
          />
          <IncomeCard
            incomeSources={incomeSources}
            setIncomeSources={setIncomeSources}
            userId={userId}
            onRefresh={refreshData}
          />
        </div>

        <div className="mt-6">
          <ExpensesCard
            expenses={expenses}
            categories={categories}
            setExpenses={setExpenses}
            userId={userId}
            onRefresh={refreshData}
          />
        </div>
      </main>
    </div>
  )
}

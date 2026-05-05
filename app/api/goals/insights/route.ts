import { NextResponse } from "next/server"
import { generateText, Output } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { totalMonthlyIncome } from "@/lib/finance"
import type { Goal, IncomeSource, Expense, Debt } from "@/lib/types"

const insightsSchema = z.object({
  insights: z
    .array(
      z.object({
        title: z.string().max(80),
        body: z.string().max(320),
        severity: z.enum(["info", "warning", "success"]),
      }),
    )
    .min(1)
    .max(4),
})

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10)

  const [goalsRes, incomeRes, expensesRes, debtsRes] = await Promise.all([
    supabase.from("goals").select("*").eq("user_id", user.id),
    supabase.from("income_sources").select("*").eq("user_id", user.id),
    supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", monthStart),
    supabase.from("debts").select("*").eq("user_id", user.id),
  ])

  const goals: Goal[] = goalsRes.data ?? []
  const incomeSources: IncomeSource[] = incomeRes.data ?? []
  const expenses: Expense[] = expensesRes.data ?? []
  const debts: Debt[] = debtsRes.data ?? []

  if (goals.length === 0) {
    return NextResponse.json(
      { error: "No goals to analyze" },
      { status: 400 },
    )
  }

  const monthlyIncome = totalMonthlyIncome(incomeSources)
  const monthToDateSpending = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0)

  const today = now.toISOString().slice(0, 10)
  const promptData = {
    today,
    monthly_income: monthlyIncome,
    month_to_date_spending: monthToDateSpending,
    total_debt: totalDebt,
    goals: goals.map((g) => ({
      name: g.name,
      type: g.type,
      target_amount: g.target_amount,
      current_amount: g.current_amount,
      progress_pct: g.target_amount > 0
        ? Math.round((g.current_amount / g.target_amount) * 100)
        : 0,
      target_date: g.target_date,
      notes: g.notes,
    })),
  }

  try {
    const { output } = await generateText({
      model: "openai/gpt-5.4-mini",
      output: Output.object({ schema: insightsSchema }),
      system:
        "You are a personal finance assistant. Look at the user's goals alongside their monthly income, month-to-date spending, and debt. Produce 2 to 4 short, concrete, actionable tips. Each tip has a short title, a body of 1-2 sentences with a specific number when possible (e.g. monthly contribution needed, projected completion date), and a severity: 'success' for on-track or completed, 'warning' for at-risk or unrealistic, 'info' otherwise. Reason across goals — prioritization matters. No fluff, no disclaimers, no advice to consult a professional.",
      prompt: JSON.stringify(promptData),
    })

    return NextResponse.json(output)
  } catch (err) {
    console.error("[goals/insights] generation failed:", err)
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 },
    )
  }
}

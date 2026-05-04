"use client"

import { useMemo } from "react"
import type { BudgetCategory, Expense } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface SpendingChartProps {
  categories: BudgetCategory[]
  expenses: Expense[]
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

export function SpendingChart({ categories, expenses }: SpendingChartProps) {
  const chartData = useMemo(() => {
    const categorySpending = new Map<string, { name: string; value: number; color: string }>()

    // Initialize with categories
    categories.forEach((cat) => {
      categorySpending.set(cat.id, {
        name: cat.name,
        value: 0,
        color: cat.color,
      })
    })

    // Sum expenses by category
    expenses.forEach((expense) => {
      if (expense.category_id && categorySpending.has(expense.category_id)) {
        const current = categorySpending.get(expense.category_id)!
        current.value += expense.amount
      }
    })

    // Calculate uncategorized
    const uncategorizedTotal = expenses
      .filter((e) => !e.category_id)
      .reduce((sum, e) => sum + e.amount, 0)

    const data = Array.from(categorySpending.values()).filter((d) => d.value > 0)

    if (uncategorizedTotal > 0) {
      data.push({
        name: "Uncategorized",
        value: uncategorizedTotal,
        color: "#94a3b8",
      })
    }

    return data
  }, [categories, expenses])

  const totalSpending = chartData.reduce((sum, d) => sum + d.value, 0)

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Spending by Category</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-sm text-muted-foreground">
            No spending data for this month yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  fontSize: "12px",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry) => {
                  const item = chartData.find((d) => d.name === value)
                  const percentage = item ? ((item.value / totalSpending) * 100).toFixed(0) : 0
                  return (
                    <span className="text-xs text-foreground">
                      {value} ({percentage}%)
                    </span>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-center">
          <p className="text-2xl font-semibold">{formatCurrency(totalSpending)}</p>
          <p className="text-xs text-muted-foreground">Total spent this month</p>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useMemo } from "react"
import type { BudgetCategory, Expense } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { PieChart, Pie, Cell, Legend } from "recharts"

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

  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {}
    chartData.forEach((d) => {
      config[d.name] = { label: d.name, color: d.color }
    })
    return config
  }, [chartData])

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
        <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  nameKey="name"
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="text-muted-foreground">{name}</span>
                      <span className="font-mono font-medium tabular-nums text-foreground">
                        {formatCurrency(value as number)}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => {
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
        </ChartContainer>
        <div className="mt-4 text-center">
          <p className="text-2xl font-semibold">{formatCurrency(totalSpending)}</p>
          <p className="text-xs text-muted-foreground">Total spent this month</p>
        </div>
      </CardContent>
    </Card>
  )
}

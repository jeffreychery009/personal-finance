"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, PiggyBank, TrendingUp, Flag } from "lucide-react"
import type { Goal } from "@/lib/types"

interface GoalsOverviewProps {
  goals: Goal[]
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

export function GoalsOverview({ goals }: GoalsOverviewProps) {
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0)
  const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0)
  const progress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : null
  const completed = goals.filter((g) => g.current_amount >= g.target_amount).length

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
          <Flag className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{goals.length}</div>
          <p className="text-xs text-muted-foreground">
            {completed} {completed === 1 ? "complete" : "complete"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Target</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{formatCurrency(totalTarget)}</div>
          <p className="text-xs text-muted-foreground">Across all goals</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Saved</CardTitle>
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalSaved)}
          </div>
          <p className="text-xs text-muted-foreground">Current progress</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {progress === null ? (
            <>
              <div className="text-2xl font-semibold text-muted-foreground">—</div>
              <p className="text-xs text-muted-foreground">No goals yet</p>
            </>
          ) : (
            <>
              <div className="text-2xl font-semibold">{progress.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(totalSaved)} of {formatCurrency(totalTarget)}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

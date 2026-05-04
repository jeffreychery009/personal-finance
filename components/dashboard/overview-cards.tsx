"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingDown, Receipt, Wallet } from "lucide-react"

interface OverviewCardsProps {
  totalIncome: number
  totalExpenses: number
  unpaidBills: number
  remainingBudget: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

export function OverviewCards({
  totalIncome,
  totalExpenses,
  unpaidBills,
  remainingBudget,
}: OverviewCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{formatCurrency(totalIncome)}</div>
          <p className="text-xs text-muted-foreground">Estimated this month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expenses</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{formatCurrency(totalExpenses)}</div>
          <p className="text-xs text-muted-foreground">Spent this month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Unpaid Bills</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{formatCurrency(unpaidBills)}</div>
          <p className="text-xs text-muted-foreground">Due this period</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Remaining</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-semibold ${remainingBudget < 0 ? "text-destructive" : ""}`}>
            {formatCurrency(remainingBudget)}
          </div>
          <p className="text-xs text-muted-foreground">After bills & expenses</p>
        </CardContent>
      </Card>
    </div>
  )
}

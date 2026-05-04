"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, TrendingDown, Scale, CreditCard } from "lucide-react"
import type { Asset, Debt } from "@/lib/types"

interface NetWorthOverviewProps {
  assets: Asset[]
  debts: Debt[]
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

export function NetWorthOverview({ assets, debts }: NetWorthOverviewProps) {
  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0)
  const totalDebts = debts.reduce((sum, d) => sum + d.balance, 0)
  const netWorth = totalAssets - totalDebts

  const cards = debts.filter(
    (d) => d.kind === "credit_card" && d.credit_limit && d.credit_limit > 0,
  )
  const ccBalance = cards.reduce((sum, d) => sum + d.balance, 0)
  const ccLimit = cards.reduce((sum, d) => sum + (d.credit_limit ?? 0), 0)
  const utilization = ccLimit > 0 ? (ccBalance / ccLimit) * 100 : null

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{formatCurrency(totalAssets)}</div>
          <p className="text-xs text-muted-foreground">
            {assets.length} {assets.length === 1 ? "item" : "items"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Debts</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{formatCurrency(totalDebts)}</div>
          <p className="text-xs text-muted-foreground">
            {debts.length} {debts.length === 1 ? "account" : "accounts"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
          <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-semibold ${netWorth < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}
          >
            {formatCurrency(netWorth)}
          </div>
          <p className="text-xs text-muted-foreground">Assets minus debts</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Credit Utilization</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {utilization === null ? (
            <>
              <div className="text-2xl font-semibold text-muted-foreground">—</div>
              <p className="text-xs text-muted-foreground">No credit cards</p>
            </>
          ) : (
            <>
              <div
                className={`text-2xl font-semibold ${
                  utilization >= 80
                    ? "text-destructive"
                    : utilization >= 50
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {utilization.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(ccBalance)} of {formatCurrency(ccLimit)}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { Debt, DebtKind } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, CreditCard, Landmark } from "lucide-react"
import { cn } from "@/lib/utils"

interface DebtsCardProps {
  debts: Debt[]
  setDebts: (fn: (prev: Debt[]) => Debt[]) => void
  userId: string
  onRefresh: () => void
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function utilizationTier(pct: number): "low" | "medium" | "high" {
  if (pct >= 80) return "high"
  if (pct >= 50) return "medium"
  return "low"
}

const TIER_BAR: Record<"low" | "medium" | "high", string> = {
  low: "bg-emerald-500",
  medium: "bg-amber-500",
  high: "bg-destructive",
}

const TIER_TEXT: Record<"low" | "medium" | "high", string> = {
  low: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  high: "text-destructive",
}

export function DebtsCard({ debts, setDebts, userId, onRefresh }: DebtsCardProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [balance, setBalance] = useState("")
  const [kind, setKind] = useState<DebtKind | "">("")
  const [apr, setApr] = useState("")
  const [creditLimit, setCreditLimit] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const resetForm = () => {
    setName("")
    setBalance("")
    setKind("")
    setApr("")
    setCreditLimit("")
  }

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kind) return
    setLoading(true)

    const { data, error } = await supabase
      .from("debts")
      .insert({
        user_id: userId,
        name,
        balance: parseFloat(balance),
        kind,
        apr: apr ? parseFloat(apr) : null,
        credit_limit: kind === "credit_card" && creditLimit ? parseFloat(creditLimit) : null,
      })
      .select()
      .single()

    if (!error && data) {
      setDebts((prev) => [data, ...prev])
      resetForm()
      setOpen(false)
    }
    setLoading(false)
    onRefresh()
  }

  const confirmDeleteDebt = (debt: Debt) => {
    const kindLabel = debt.kind === "credit_card" ? "Credit card" : "Loan"
    toast(`Delete "${debt.name}"?`, {
      description: `${kindLabel} · ${formatCurrency(debt.balance)} balance. This cannot be undone.`,
      action: {
        label: "Delete",
        onClick: async () => {
          const { error } = await supabase.from("debts").delete().eq("id", debt.id)
          if (error) {
            toast.error("Failed to delete debt", { description: error.message })
            return
          }
          setDebts((prev) => prev.filter((d) => d.id !== debt.id))
          toast.success(`Deleted "${debt.name}"`)
          onRefresh()
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
    })
  }

  const handleDialogOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) resetForm()
  }

  const sorted = [...debts].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "credit_card" ? -1 : 1
    return b.balance - a.balance
  })

  const creditCards = sorted.filter((d) => d.kind === "credit_card")
  const loans = sorted.filter((d) => d.kind === "loan")

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">Debts</CardTitle>
        <Dialog open={open} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Debt</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddDebt} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="debt-kind">Type</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as DebtKind)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="loan">Loan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="debt-name">Name</Label>
                <Input
                  id="debt-name"
                  placeholder={
                    kind === "credit_card" ? "e.g., Chase Sapphire" : "e.g., Auto Loan"
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="debt-balance">
                  {kind === "credit_card" ? "Current Balance" : "Balance"}
                </Label>
                <Input
                  id="debt-balance"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="1200.00"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="debt-apr">
                  APR (%) {kind !== "credit_card" && "(optional)"}
                </Label>
                <Input
                  id="debt-apr"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="22.99"
                  value={apr}
                  onChange={(e) => setApr(e.target.value)}
                  required={kind === "credit_card"}
                />
              </div>
              {kind === "credit_card" && (
                <div className="space-y-2">
                  <Label htmlFor="debt-limit">Credit Limit</Label>
                  <Input
                    id="debt-limit"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="5000.00"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    required
                  />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Adding..." : "Add Debt"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {debts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No debts yet. Add a credit card or loan to track.
          </p>
        ) : (
          <div className="space-y-4">
            {creditCards.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Credit Cards</h4>
                {creditCards.map((debt) => {
                  const limit = debt.credit_limit ?? 0
                  const pct = limit > 0 ? Math.min(100, (debt.balance / limit) * 100) : 0
                  const tier = utilizationTier(pct)
                  return (
                    <div
                      key={debt.id}
                      className="space-y-2 rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{debt.name}</span>
                          {debt.apr !== null && (
                            <Badge variant="outline" className="text-xs">
                              {debt.apr}% APR
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {formatCurrency(debt.balance)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => confirmDeleteDebt(debt)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {limit > 0 && (
                        <div className="space-y-1">
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn("h-full transition-all", TIER_BAR[tier])}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {formatCurrency(debt.balance)} of {formatCurrency(limit)}
                            </span>
                            <span className={cn("font-medium", TIER_TEXT[tier])}>
                              {pct.toFixed(1)}% utilization
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {loans.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Loans</h4>
                {loans.map((debt) => (
                  <div
                    key={debt.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{debt.name}</span>
                      {debt.apr !== null && (
                        <Badge variant="outline" className="text-xs">
                          {debt.apr}% APR
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {formatCurrency(debt.balance)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => confirmDeleteDebt(debt)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

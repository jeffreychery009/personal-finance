"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { IncomeSource } from "@/lib/types"
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
import { Plus, Trash2, Briefcase } from "lucide-react"

interface IncomeCardProps {
  incomeSources: IncomeSource[]
  setIncomeSources: (fn: (prev: IncomeSource[]) => IncomeSource[]) => void
  userId: string
  onRefresh: () => void
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  "bi-weekly": "Bi-weekly",
  monthly: "Monthly",
  annually: "Annually",
}

export function IncomeCard({
  incomeSources,
  setIncomeSources,
  userId,
  onRefresh,
}: IncomeCardProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [frequency, setFrequency] = useState<string>("")
  const [nextPayDate, setNextPayDate] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase
      .from("income_sources")
      .insert({
        user_id: userId,
        name,
        amount: parseFloat(amount),
        frequency,
        next_pay_date: nextPayDate || null,
      })
      .select()
      .single()

    if (!error && data) {
      setIncomeSources((prev) => [...prev, data])
      resetForm()
      setOpen(false)
    }
    setLoading(false)
    onRefresh()
  }

  const resetForm = () => {
    setName("")
    setAmount("")
    setFrequency("")
    setNextPayDate("")
  }

  const handleDeleteIncome = async (id: string) => {
    const { error } = await supabase.from("income_sources").delete().eq("id", id)
    if (!error) {
      setIncomeSources((prev) => prev.filter((s) => s.id !== id))
    }
    onRefresh()
  }

  const getMonthlyEquivalent = (source: IncomeSource) => {
    switch (source.frequency) {
      case "weekly":
        // 52 weeks / 12 months — `* 4` undercounts by ~8%.
        return source.amount * (52 / 12)
      case "bi-weekly":
        return source.amount * (26 / 12)
      case "annually":
        return source.amount / 12
      default:
        return source.amount
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">Income Sources</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Income Source</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddIncome} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="income-name">Source Name</Label>
                <Input
                  id="income-name"
                  placeholder="e.g., Salary, Freelance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="income-amount">Amount</Label>
                <Input
                  id="income-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="5000.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="income-frequency">Pay Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="next-pay-date">Next Pay Date (optional)</Label>
                <Input
                  id="next-pay-date"
                  type="date"
                  value={nextPayDate}
                  onChange={(e) => setNextPayDate(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Adding..." : "Add Income Source"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {incomeSources.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No income sources yet. Add your first income source.
          </p>
        ) : (
          <div className="space-y-3">
            {incomeSources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                    <Briefcase className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{source.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {FREQUENCY_LABELS[source.frequency]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatCurrency(source.amount)} / {source.frequency.replace("-", " ")}</span>
                      {source.next_pay_date && (
                        <>
                          <span>·</span>
                          <span>Next: {formatDate(source.next_pay_date)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {formatCurrency(getMonthlyEquivalent(source))}
                    </div>
                    <div className="text-xs text-muted-foreground">/ month</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteIncome(source.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

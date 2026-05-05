"use client"

import { useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { Goal, GoalType } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker, dateFromISO, dateToISO } from "@/components/ui/date-picker"
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
import { Plus, Trash2, Pencil, Coins } from "lucide-react"

interface GoalsCardProps {
  goals: Goal[]
  setGoals: (fn: (prev: Goal[]) => Goal[]) => void
  userId: string
  onRefresh: () => void
}

const GOAL_TYPE_OPTIONS: { value: GoalType; label: string }[] = [
  { value: "savings", label: "Savings" },
  { value: "debt_payoff", label: "Debt Payoff" },
  { value: "purchase", label: "Purchase" },
  { value: "investment", label: "Investment" },
  { value: "other", label: "Other" },
]

const TYPE_LABEL: Record<GoalType, string> = GOAL_TYPE_OPTIONS.reduce(
  (acc, opt) => ({ ...acc, [opt.value]: opt.label }),
  {} as Record<GoalType, string>,
)

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function GoalsCard({ goals, setGoals, userId, onRefresh }: GoalsCardProps) {
  const supabase = createClient()

  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [contributing, setContributing] = useState<Goal | null>(null)

  const [name, setName] = useState("")
  const [type, setType] = useState<GoalType | "">("")
  const [targetAmount, setTargetAmount] = useState("")
  const [currentAmount, setCurrentAmount] = useState("")
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined)
  const [notes, setNotes] = useState("")
  const [contribution, setContribution] = useState("")
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setName("")
    setType("")
    setTargetAmount("")
    setCurrentAmount("")
    setTargetDate(undefined)
    setNotes("")
  }

  const handleAddOpenChange = (next: boolean) => {
    setAddOpen(next)
    if (!next) resetForm()
  }

  const handleEditOpenChange = (next: boolean) => {
    if (!next) {
      setEditing(null)
      resetForm()
    }
  }

  const handleContributeOpenChange = (next: boolean) => {
    if (!next) {
      setContributing(null)
      setContribution("")
    }
  }

  const startEdit = (goal: Goal) => {
    setEditing(goal)
    setName(goal.name)
    setType(goal.type)
    setTargetAmount(String(goal.target_amount))
    setCurrentAmount(String(goal.current_amount))
    setTargetDate(dateFromISO(goal.target_date))
    setNotes(goal.notes ?? "")
  }

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!type) return
    setLoading(true)

    const { data, error } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        name,
        type,
        target_amount: parseFloat(targetAmount),
        current_amount: currentAmount ? parseFloat(currentAmount) : 0,
        target_date: dateToISO(targetDate),
        notes: notes.trim() || null,
      })
      .select()
      .single()

    if (error) {
      toast.error("Failed to add goal", { description: error.message })
    } else if (data) {
      setGoals((prev) => [data, ...prev])
      resetForm()
      setAddOpen(false)
      onRefresh()
    }
    setLoading(false)
  }

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing || !type) return
    setLoading(true)

    const { data, error } = await supabase
      .from("goals")
      .update({
        name,
        type,
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount),
        target_date: dateToISO(targetDate),
        notes: notes.trim() || null,
      })
      .eq("id", editing.id)
      .select()
      .single()

    if (error) {
      toast.error("Failed to update goal", { description: error.message })
    } else if (data) {
      setGoals((prev) => prev.map((g) => (g.id === data.id ? data : g)))
      setEditing(null)
      resetForm()
      onRefresh()
    }
    setLoading(false)
  }

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contributing) return
    const delta = parseFloat(contribution)
    if (!Number.isFinite(delta) || delta <= 0) return
    setLoading(true)

    const newAmount = contributing.current_amount + delta
    const { data, error } = await supabase
      .from("goals")
      .update({ current_amount: newAmount })
      .eq("id", contributing.id)
      .select()
      .single()

    if (error) {
      toast.error("Failed to add contribution", { description: error.message })
    } else if (data) {
      setGoals((prev) => prev.map((g) => (g.id === data.id ? data : g)))
      toast.success(`Added ${formatCurrency(delta)} to "${data.name}"`)
      setContributing(null)
      setContribution("")
      onRefresh()
    }
    setLoading(false)
  }

  const confirmDeleteGoal = (goal: Goal) => {
    toast(`Delete "${goal.name}"?`, {
      description: `${formatCurrency(goal.current_amount)} of ${formatCurrency(goal.target_amount)} saved. This cannot be undone.`,
      action: {
        label: "Delete",
        onClick: async () => {
          const { error } = await supabase.from("goals").delete().eq("id", goal.id)
          if (error) {
            toast.error("Failed to delete goal", { description: error.message })
            return
          }
          setGoals((prev) => prev.filter((g) => g.id !== goal.id))
          toast.success(`Deleted "${goal.name}"`)
          onRefresh()
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
    })
  }

  const goalForm = (mode: "add" | "edit") => (
    <form
      onSubmit={mode === "add" ? handleAddGoal : handleUpdateGoal}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="goal-name">Name</Label>
        <Input
          id="goal-name"
          placeholder="e.g., Emergency Fund"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="goal-type">Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as GoalType)} required>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {GOAL_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="goal-target">Target amount</Label>
          <Input
            id="goal-target"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="5000.00"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="goal-current">Current amount</Label>
          <Input
            id="goal-current"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={currentAmount}
            onChange={(e) => setCurrentAmount(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="goal-date">Target date (optional)</Label>
        <DatePicker
          id="goal-date"
          value={targetDate}
          onChange={setTargetDate}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="goal-notes">Notes (optional)</Label>
        <Textarea
          id="goal-notes"
          placeholder="Why this goal matters, plan to fund it, etc."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? mode === "add"
            ? "Adding..."
            : "Saving..."
          : mode === "add"
            ? "Add Goal"
            : "Save Changes"}
      </Button>
    </form>
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">Goals</CardTitle>
        <Dialog open={addOpen} onOpenChange={handleAddOpenChange}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Goal</DialogTitle>
            </DialogHeader>
            {goalForm("add")}
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No goals yet. Add your first goal to start tracking.
          </p>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => {
              const pct = Math.min(
                100,
                goal.target_amount > 0
                  ? (goal.current_amount / goal.target_amount) * 100
                  : 0,
              )
              const completed = goal.current_amount >= goal.target_amount
              return (
                <div
                  key={goal.id}
                  className="rounded-lg border border-border p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{goal.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {TYPE_LABEL[goal.type]}
                        </Badge>
                        {completed && (
                          <Badge className="text-xs bg-emerald-600 hover:bg-emerald-600">
                            Complete
                          </Badge>
                        )}
                      </div>
                      {goal.target_date && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Target: {formatDate(goal.target_date)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setContributing(goal)}
                        aria-label="Add contribution"
                      >
                        <Coins className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => startEdit(goal)}
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => confirmDeleteGoal(goal)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Progress value={pct} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {formatCurrency(goal.current_amount)} of{" "}
                      {formatCurrency(goal.target_amount)}
                    </span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={handleEditOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
          </DialogHeader>
          {goalForm("edit")}
        </DialogContent>
      </Dialog>

      <Dialog open={contributing !== null} onOpenChange={handleContributeOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {contributing ? `Add to "${contributing.name}"` : "Add Contribution"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleContribute} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contribution-amount">Amount</Label>
              <Input
                id="contribution-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="100.00"
                value={contribution}
                onChange={(e) => setContribution(e.target.value)}
                required
                autoFocus
              />
              {contributing && (
                <p className="text-xs text-muted-foreground">
                  Currently {formatCurrency(contributing.current_amount)} of{" "}
                  {formatCurrency(contributing.target_amount)}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Adding..." : "Add Contribution"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

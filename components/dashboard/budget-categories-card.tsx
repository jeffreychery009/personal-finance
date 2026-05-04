"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Bill, BudgetCategory, Expense } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Pencil, Plus, Trash2 } from "lucide-react"

interface BudgetCategoriesCardProps {
  categories: BudgetCategory[]
  expenses: Expense[]
  bills: Bill[]
  setCategories: (fn: (prev: BudgetCategory[]) => BudgetCategory[]) => void
  userId: string
  onRefresh: () => void
}

const CATEGORY_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

export function BudgetCategoriesCard({
  categories,
  expenses,
  bills,
  setCategories,
  userId,
  onRefresh,
}: BudgetCategoriesCardProps) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [budgetLimit, setBudgetLimit] = useState("")
  const [color, setColor] = useState(CATEGORY_COLORS[0])
  const [isVariable, setIsVariable] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const resetForm = () => {
    setEditingId(null)
    setName("")
    setBudgetLimit("")
    setColor(CATEGORY_COLORS[0])
    setIsVariable(false)
  }

  const handleDialogOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) resetForm()
  }

  const handleStartEdit = (category: BudgetCategory) => {
    setEditingId(category.id)
    setName(category.name)
    setBudgetLimit(category.budget_limit.toString())
    setColor(category.color)
    setIsVariable(category.is_variable ?? false)
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const payload = {
      name,
      budget_limit: parseFloat(budgetLimit),
      color,
      is_variable: isVariable,
    }

    if (editingId) {
      const { data, error } = await supabase
        .from("budget_categories")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single()

      if (!error && data) {
        setCategories((prev) => prev.map((c) => (c.id === editingId ? data : c)))
        resetForm()
        setOpen(false)
      }
    } else {
      const { data, error } = await supabase
        .from("budget_categories")
        .insert({ user_id: userId, ...payload })
        .select()
        .single()

      if (!error && data) {
        setCategories((prev) => [...prev, data])
        resetForm()
        setOpen(false)
      }
    }
    setLoading(false)
    onRefresh()
  }

  const handleDeleteCategory = async (id: string) => {
    const { error } = await supabase.from("budget_categories").delete().eq("id", id)
    if (!error) {
      setCategories((prev) => prev.filter((c) => c.id !== id))
    }
    onRefresh()
  }

  const getCategorySpent = (categoryId: string) => {
    // Expenses cover money already out the door (paid bills auto-create
    // an expense). Add unpaid bills with this category so the progress
    // bar also reflects committed-but-not-yet-paid spend without
    // double-counting paid bills.
    const expenseTotal = expenses
      .filter((e) => e.category_id === categoryId)
      .reduce((sum, e) => sum + e.amount, 0)
    const unpaidBillTotal = bills
      .filter((b) => b.category_id === categoryId && !b.is_paid)
      .reduce((sum, b) => sum + b.amount, 0)
    return expenseTotal + unpaidBillTotal
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">Budget Categories</CardTitle>
        <Dialog open={open} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Budget Category" : "Add Budget Category"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Name</Label>
                <Input
                  id="category-name"
                  placeholder="e.g., Groceries"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-limit">Monthly Budget</Label>
                <Input
                  id="budget-limit"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="500.00"
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`h-8 w-8 rounded-full border-2 ${
                        color === c ? "border-foreground" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="is-variable"
                  checked={isVariable}
                  onCheckedChange={(checked) => setIsVariable(checked === true)}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <Label htmlFor="is-variable" className="font-normal">
                    Variable expense category
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    e.g. Groceries, Gas — amount changes each time
                  </p>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? editingId
                    ? "Saving..."
                    : "Adding..."
                  : editingId
                    ? "Save Changes"
                    : "Add Category"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No categories yet. Add your first budget category.
          </p>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => {
              const spent = getCategorySpent(category.id)
              const percentage = Math.min((spent / category.budget_limit) * 100, 100)
              const isOverBudget = spent > category.budget_limit

              return (
                <div key={category.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm font-medium">{category.name}</span>
                      {category.is_variable && (
                        <Badge variant="outline" className="text-xs">
                          Variable
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${isOverBudget ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {formatCurrency(spent)} / {formatCurrency(category.budget_limit)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => handleStartEdit(category)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Progress
                    value={percentage}
                    className={`h-2 ${isOverBudget ? "[&>div]:bg-destructive" : ""}`}
                  />
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

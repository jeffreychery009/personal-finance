"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { BudgetCategory, Expense } from "@/lib/types"
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
import { Progress } from "@/components/ui/progress"
import { Plus, Trash2 } from "lucide-react"

interface BudgetCategoriesCardProps {
  categories: BudgetCategory[]
  expenses: Expense[]
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
  setCategories,
  userId,
  onRefresh,
}: BudgetCategoriesCardProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [budgetLimit, setBudgetLimit] = useState("")
  const [color, setColor] = useState(CATEGORY_COLORS[0])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase
      .from("budget_categories")
      .insert({
        user_id: userId,
        name,
        budget_limit: parseFloat(budgetLimit),
        color,
      })
      .select()
      .single()

    if (!error && data) {
      setCategories((prev) => [...prev, data])
      setName("")
      setBudgetLimit("")
      setColor(CATEGORY_COLORS[0])
      setOpen(false)
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
    return expenses
      .filter((e) => e.category_id === categoryId)
      .reduce((sum, e) => sum + e.amount, 0)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">Budget Categories</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Budget Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddCategory} className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Adding..." : "Add Category"}
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
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${isOverBudget ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {formatCurrency(spent)} / {formatCurrency(category.budget_limit)}
                      </span>
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

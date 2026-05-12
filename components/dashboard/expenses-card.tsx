"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { Expense, BudgetCategory } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker, dateToISO, dateFromISO } from "@/components/ui/date-picker"
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Plus, Trash2, Receipt, Pencil } from "lucide-react"

const PAGE_SIZE = 10

interface ExpensesCardProps {
  expenses: Expense[]
  categories: BudgetCategory[]
  setExpenses: (fn: (prev: Expense[]) => Expense[]) => void
  userId: string
  onRefresh: () => void
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function ExpensesCard({
  expenses,
  categories,
  setExpenses,
  userId,
  onRefresh,
}: ExpensesCardProps) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState<Date | undefined>(() => new Date())
  const [categoryId, setCategoryId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editDescription, setEditDescription] = useState("")
  const [editAmount, setEditAmount] = useState("")
  const [editDate, setEditDate] = useState<Date | undefined>(undefined)
  const [editCategoryId, setEditCategoryId] = useState<string>("")
  const [editLoading, setEditLoading] = useState(false)
  const [page, setPage] = useState(1)
  const supabase = createClient()

  const totalPages = Math.max(1, Math.ceil(expenses.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageExpenses = useMemo(
    () => expenses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [expenses, currentPage],
  )

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date) return
    setLoading(true)

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id: userId,
        description,
        amount: parseFloat(amount),
        date: dateToISO(date),
        category_id: categoryId || null,
      })
      .select("*, category:budget_categories(*)")
      .single()

    if (!error && data) {
      setExpenses((prev) => [data, ...prev])
      resetForm()
      setOpen(false)
    }
    setLoading(false)
    onRefresh()
  }

  const resetForm = () => {
    setDescription("")
    setAmount("")
    setDate(new Date())
    setCategoryId("")
  }

  const handleDeleteExpense = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id)
    if (!error) {
      setExpenses((prev) => prev.filter((e) => e.id !== id))
    }
    onRefresh()
  }

  const openEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setEditDescription(expense.description)
    setEditAmount(expense.amount.toString())
    setEditDate(dateFromISO(expense.date))
    setEditCategoryId(expense.category_id ?? "")
  }

  const handleEditOpenChange = (next: boolean) => {
    if (!next) {
      setEditingExpense(null)
      setEditDescription("")
      setEditAmount("")
      setEditDate(undefined)
      setEditCategoryId("")
    }
  }

  const handleEditExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense || !editDate) return
    const newAmount = parseFloat(editAmount)
    if (Number.isNaN(newAmount) || newAmount < 0) {
      toast.error("Enter a valid amount")
      return
    }
    setEditLoading(true)
    const { data, error } = await supabase
      .from("expenses")
      .update({
        description: editDescription,
        amount: newAmount,
        date: dateToISO(editDate),
        category_id: editCategoryId || null,
      })
      .eq("id", editingExpense.id)
      .select("*, category:budget_categories(*)")
      .single()

    if (error || !data) {
      toast.error("Failed to update expense", { description: error?.message })
      setEditLoading(false)
      return
    }

    setExpenses((prev) => prev.map((ex) => (ex.id === data.id ? data : ex)))
    toast.success(`Updated "${data.description}"`)
    setEditingExpense(null)
    setEditDescription("")
    setEditAmount("")
    setEditDate(undefined)
    setEditCategoryId("")
    setEditLoading(false)
    onRefresh()
  }

  const getCategoryColor = (categoryId: string | null) => {
    if (!categoryId) return "#94a3b8"
    const category = categories.find((c) => c.id === categoryId)
    return category?.color || "#94a3b8"
  }

  const getCategoryName = (expense: Expense) => {
    if (expense.category) return expense.category.name
    const category = categories.find((c) => c.id === expense.category_id)
    return category?.name || "Uncategorized"
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">Recent Expenses</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="expense-description">Description</Label>
                <Input
                  id="expense-description"
                  placeholder="e.g., Grocery shopping"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-amount">Amount</Label>
                <Input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="75.50"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-date">Date</Label>
                <DatePicker
                  id="expense-date"
                  value={date}
                  onChange={setDate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-category">Category (optional)</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Adding..." : "Add Expense"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No expenses recorded yet. Add your first expense.
          </p>
        ) : (
          <div className="space-y-2">
            {pageExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: getCategoryColor(expense.category_id) + "20" }}
                  >
                    <Receipt
                      className="h-4 w-4"
                      style={{ color: getCategoryColor(expense.category_id) }}
                    />
                  </div>
                  <div>
                    <span className="text-sm font-medium">{expense.description}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDate(expense.date)}</span>
                      <span>·</span>
                      <span
                        className="flex items-center gap-1"
                        style={{ color: getCategoryColor(expense.category_id) }}
                      >
                        <div
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: getCategoryColor(expense.category_id) }}
                        />
                        {getCategoryName(expense)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    -{formatCurrency(expense.amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => openEditExpense(expense)}
                    aria-label={`Edit ${expense.description}`}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteExpense(expense.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            {totalPages > 1 && (
              <Pagination className="pt-2">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      aria-disabled={currentPage === 1}
                      className={
                        currentPage === 1 ? "pointer-events-none opacity-50" : undefined
                      }
                      onClick={(e) => {
                        e.preventDefault()
                        if (currentPage > 1) setPage(currentPage - 1)
                      }}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === currentPage}
                        onClick={(e) => {
                          e.preventDefault()
                          setPage(p)
                        }}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      aria-disabled={currentPage === totalPages}
                      className={
                        currentPage === totalPages
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                      onClick={(e) => {
                        e.preventDefault()
                        if (currentPage < totalPages) setPage(currentPage + 1)
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}
      </CardContent>
      <Dialog open={editingExpense !== null} onOpenChange={handleEditOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? `Edit · ${editingExpense.description}` : "Edit expense"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditExpense} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-expense-description">Description</Label>
              <Input
                id="edit-expense-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-expense-amount">Amount</Label>
              <Input
                id="edit-expense-amount"
                type="number"
                step="0.01"
                min="0"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-expense-date">Date</Label>
              <DatePicker id="edit-expense-date" value={editDate} onChange={setEditDate} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-expense-category">Category (optional)</Label>
              <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={editLoading}>
              {editLoading ? "Saving..." : "Save"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

"use client"

import { useState } from "react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import type { Bill, BudgetCategory, Expense } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
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
import { Plus, Trash2, AlertCircle, Check } from "lucide-react"

interface BillsCardProps {
  bills: Bill[]
  categories: BudgetCategory[]
  setBills: (fn: (prev: Bill[]) => Bill[]) => void
  setExpenses: (fn: (prev: Expense[]) => Expense[]) => void
  userId: string
  onRefresh: () => void
}

function todayISODate(): string {
  return new Date().toISOString().split("T")[0]
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
  })
}

function isDueSoon(dateStr: string) {
  const dueDate = new Date(dateStr)
  const today = new Date()
  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays >= 0 && diffDays <= 7
}

function isOverdue(dateStr: string) {
  // Compare as YYYY-MM-DD strings to avoid the UTC-vs-local timezone gotcha
  // where `new Date("2025-01-01")` is parsed as UTC midnight.
  return dateStr < todayISODate()
}

export function BillsCard({
  bills,
  categories,
  setBills,
  setExpenses,
  userId,
  onRefresh,
}: BillsCardProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<string>("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dueDate) return
    setLoading(true)

    const { data, error } = await supabase
      .from("bills")
      .insert({
        user_id: userId,
        name,
        amount: parseFloat(amount),
        due_date: format(dueDate, "yyyy-MM-dd"),
        is_recurring: isRecurring,
        frequency: isRecurring ? frequency : null,
        category_id: categoryId || null,
      })
      .select("*, category:budget_categories(*)")
      .single()

    if (!error && data) {
      setBills((prev) => [...prev, data])
      resetForm()
      setOpen(false)
    }
    setLoading(false)
    onRefresh()
  }

  const resetForm = () => {
    setName("")
    setAmount("")
    setDueDate(undefined)
    setIsRecurring(false)
    setFrequency("")
    setCategoryId("")
  }

  const handleDeleteBill = async (id: string) => {
    const { error } = await supabase.from("bills").delete().eq("id", id)
    if (!error) {
      setBills((prev) => prev.filter((b) => b.id !== id))
    }
    onRefresh()
  }

  const handleMarkPaid = async (bill: Bill) => {
    const { error: billError } = await supabase
      .from("bills")
      .update({ is_paid: true })
      .eq("id", bill.id)

    if (billError) return

    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        user_id: userId,
        description: `Bill: ${bill.name}`,
        amount: bill.amount,
        date: todayISODate(),
        category_id: bill.category_id,
        bill_id: bill.id,
      })
      .select("*, category:budget_categories(*)")
      .single()

    if (expenseError || !expenseData) {
      // Roll the bill update back so the two writes stay consistent.
      await supabase.from("bills").update({ is_paid: false }).eq("id", bill.id)
      onRefresh()
      return
    }

    setBills((prev) => prev.map((b) => (b.id === bill.id ? { ...b, is_paid: true } : b)))
    setExpenses((prev) => [expenseData, ...prev])
    onRefresh()
  }

  const handleMarkUnpaid = async (bill: Bill) => {
    const { error: billError } = await supabase
      .from("bills")
      .update({ is_paid: false })
      .eq("id", bill.id)

    if (billError) return

    const { error: expenseError } = await supabase
      .from("expenses")
      .delete()
      .eq("bill_id", bill.id)

    if (expenseError) {
      // Roll the bill update back so the two writes stay consistent.
      await supabase.from("bills").update({ is_paid: true }).eq("id", bill.id)
      onRefresh()
      return
    }

    setBills((prev) => prev.map((b) => (b.id === bill.id ? { ...b, is_paid: false } : b)))
    setExpenses((prev) => prev.filter((e) => e.bill_id !== bill.id))
    onRefresh()
  }

  const unpaidBills = bills.filter((b) => !b.is_paid)
  const paidBills = bills.filter((b) => b.is_paid)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">Bills</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Bill</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddBill} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bill-name">Name</Label>
                <Input
                  id="bill-name"
                  placeholder="e.g., Electricity"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bill-amount">Amount</Label>
                <Input
                  id="bill-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="150.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bill-due-date">Due Date</Label>
                <DatePicker
                  id="bill-due-date"
                  value={dueDate}
                  onChange={setDueDate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bill-category">Category (optional)</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is-recurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => setIsRecurring(checked === true)}
                />
                <Label htmlFor="is-recurring" className="font-normal">
                  Recurring bill
                </Label>
              </div>
              {isRecurring && (
                <div className="space-y-2">
                  <Label htmlFor="bill-frequency">Frequency</Label>
                  <Select value={frequency} onValueChange={setFrequency} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Adding..." : "Add Bill"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {bills.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No bills yet. Add your first bill to track.
          </p>
        ) : (
          <div className="space-y-4">
            {unpaidBills.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Unpaid</h4>
                {unpaidBills.map((bill) => {
                  const overdue = isOverdue(bill.due_date)
                  const dueSoon = isDueSoon(bill.due_date)
                  
                  return (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMarkPaid(bill)}
                          title="Mark as paid"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{bill.name}</span>
                            {overdue && (
                              <Badge variant="destructive" className="gap-1 text-xs">
                                <AlertCircle className="h-3 w-3" />
                                Overdue
                              </Badge>
                            )}
                            {!overdue && dueSoon && (
                              <Badge variant="secondary" className="text-xs">
                                Due soon
                              </Badge>
                            )}
                            {bill.is_recurring && (
                              <Badge variant="outline" className="text-xs">
                                {bill.frequency}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Due {formatDate(bill.due_date)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {formatCurrency(bill.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteBill(bill.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {paidBills.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Paid</h4>
                {paidBills.slice(0, 3).map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3 opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 border-primary bg-primary/10 hover:bg-primary/20"
                        onClick={() => handleMarkUnpaid(bill)}
                        title="Mark as unpaid"
                      >
                        <Check className="h-3 w-3 text-primary" />
                      </Button>
                      <span className="text-sm line-through">{bill.name}</span>
                    </div>
                    <span className="text-sm">{formatCurrency(bill.amount)}</span>
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

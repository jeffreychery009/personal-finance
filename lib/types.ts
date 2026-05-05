export interface Profile {
  id: string
  email: string | null
  created_at: string
}

export interface BudgetCategory {
  id: string
  user_id: string
  name: string
  budget_limit: number
  color: string
  is_variable: boolean
  created_at: string
}

export interface IncomeSource {
  id: string
  user_id: string
  name: string
  amount: number
  frequency: "weekly" | "bi-weekly" | "monthly" | "annually"
  next_pay_date: string | null
  created_at: string
}

export interface Bill {
  id: string
  user_id: string
  name: string
  amount: number
  due_date: string
  is_recurring: boolean
  frequency: "weekly" | "monthly" | "quarterly" | "annually" | null
  category_id: string | null
  is_paid: boolean
  created_at: string
  category?: BudgetCategory
}

export interface Expense {
  id: string
  user_id: string
  description: string
  amount: number
  date: string
  category_id: string | null
  bill_id: string | null
  created_at: string
  category?: BudgetCategory
}

export interface DashboardData {
  profile: Profile | null
  categories: BudgetCategory[]
  incomeSources: IncomeSource[]
  bills: Bill[]
  expenses: Expense[]
}

export type AssetType = "cash" | "investment" | "real_estate" | "vehicle" | "other"

export interface Asset {
  id: string
  user_id: string
  name: string
  value: number
  type: AssetType
  created_at: string
}

export type DebtKind = "credit_card" | "loan"

export interface Debt {
  id: string
  user_id: string
  name: string
  balance: number
  kind: DebtKind
  apr: number | null
  credit_limit: number | null
  created_at: string
}

export type GoalType = "savings" | "debt_payoff" | "purchase" | "investment" | "other"

export interface Goal {
  id: string
  user_id: string
  name: string
  type: GoalType
  target_amount: number
  current_amount: number
  target_date: string | null
  notes: string | null
  created_at: string
}

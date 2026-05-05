import type { IncomeSource } from "@/lib/types"

const WEEKLY_PER_MONTH = 52 / 12
const BIWEEKLY_PER_MONTH = 26 / 12

export function monthlyEquivalent(source: IncomeSource): number {
  switch (source.frequency) {
    case "weekly":
      return source.amount * WEEKLY_PER_MONTH
    case "bi-weekly":
      return source.amount * BIWEEKLY_PER_MONTH
    case "annually":
      return source.amount / 12
    default:
      return source.amount
  }
}

export function totalMonthlyIncome(sources: IncomeSource[]): number {
  return sources.reduce((sum, s) => sum + monthlyEquivalent(s), 0)
}

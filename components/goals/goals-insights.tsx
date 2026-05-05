"use client"

import { useState } from "react"
import { toast } from "sonner"
import type { Goal } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Sparkles, AlertTriangle, CheckCircle2, Info } from "lucide-react"

type Severity = "info" | "warning" | "success"

interface Insight {
  title: string
  body: string
  severity: Severity
}

interface GoalsInsightsProps {
  goals: Goal[]
}

const SEVERITY_ICON: Record<Severity, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
}

const SEVERITY_COLOR: Record<Severity, string> = {
  info: "text-foreground",
  warning: "text-amber-600 dark:text-amber-400",
  success: "text-emerald-600 dark:text-emerald-400",
}

export function GoalsInsights({ goals }: GoalsInsightsProps) {
  const [insights, setInsights] = useState<Insight[] | null>(null)
  const [loading, setLoading] = useState(false)
  const disabled = goals.length === 0 || loading

  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/goals/insights", { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      const data = (await res.json()) as { insights: Insight[] }
      setInsights(data.insights)
    } catch (err) {
      toast.error("Failed to generate insights", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Insights
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={handleClick}
          disabled={disabled}
        >
          {loading ? "Thinking..." : insights ? "Refresh" : "Get insights"}
        </Button>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add a goal first to get personalized insights.
          </p>
        ) : loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : insights === null ? (
          <p className="text-sm text-muted-foreground">
            Get a holistic look at your goals using your income and recent spending.
          </p>
        ) : (
          <ul className="space-y-3">
            {insights.map((insight, i) => {
              const Icon = SEVERITY_ICON[insight.severity]
              return (
                <li key={i} className="flex gap-3">
                  <Icon
                    className={`h-4 w-4 mt-0.5 shrink-0 ${SEVERITY_COLOR[insight.severity]}`}
                  />
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-medium">{insight.title}</p>
                    <p className="text-sm text-muted-foreground">{insight.body}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

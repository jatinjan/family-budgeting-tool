import { Target } from "lucide-react"
import { hasIntentionContent } from "@/lib/balance-home"
import { formatCurrency } from "@/lib/utils/formatters"
import { cn } from "@/lib/utils"

type IntentionProfile = {
  balance_goal?: string | null
  yearly_savings_goal?: string | null
  monthly_buffer?: string | null
}

function formatOptionalAmount(value: string | null | undefined): string | null {
  if (value == null || String(value).trim() === "") return null
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value).trim()
  return formatCurrency(n)
}

/**
 * Read-only Balance intention for admin consultation / briefing.
 */
export function BalanceIntentionSummary({
  profile,
  className,
  compact = false,
}: {
  profile: IntentionProfile | null | undefined
  className?: string
  compact?: boolean
}) {
  if (!hasIntentionContent(profile)) {
    if (compact) return null
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>No intention set yet</p>
    )
  }

  const yearly = formatOptionalAmount(profile?.yearly_savings_goal)
  const monthly = formatOptionalAmount(profile?.monthly_buffer)

  return (
    <div
      className={cn(
        "rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Intention
          </p>
          {profile?.balance_goal?.trim() ? (
            <p className="font-medium text-foreground">{profile.balance_goal.trim()}</p>
          ) : null}
          {(yearly || monthly) && (
            <p className="text-xs text-muted-foreground">
              {yearly ? <>Yearly {yearly}</> : null}
              {yearly && monthly ? " · " : null}
              {monthly ? <>Monthly buffer {monthly}</> : null}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

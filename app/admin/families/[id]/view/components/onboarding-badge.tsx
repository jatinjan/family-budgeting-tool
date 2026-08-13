import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { BRAND } from '../consultation-ui'

type OnboardingStatus = 'signed_up' | 'profile_complete' | 'budget_started' | 'plan_complete'

const ONBOARDING_LABELS: Record<OnboardingStatus, string> = {
  signed_up: 'Just Registered',
  profile_complete: 'Profile Complete',
  budget_started: 'Budget In Progress',
  plan_complete: 'Plan Complete',
}

export function OnboardingBadge({ status }: { status: string }) {
  const label = ONBOARDING_LABELS[status as OnboardingStatus] || status

  switch (status) {
    case 'plan_complete':
      return (
        <Badge
          className="border-transparent text-xs"
          style={{ backgroundColor: `${BRAND.teal}20`, color: BRAND.deepTeal }}
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {label}
        </Badge>
      )
    case 'budget_started':
      return (
        <Badge className="border-transparent bg-amber-100 text-amber-700 text-xs">
          <Clock className="h-3 w-3 mr-1" />
          {label}
        </Badge>
      )
    case 'profile_complete':
      return (
        <Badge className="border-transparent bg-sky-100 text-sky-700 text-xs">
          {label}
        </Badge>
      )
    case 'signed_up':
    default:
      return (
        <Badge className="border-transparent bg-gray-100 text-gray-600 text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          {label}
        </Badge>
      )
  }
}

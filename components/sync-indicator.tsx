"use client"

import { Cloud, CloudOff, Loader2, AlertCircle, Check, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useSync, useSyncStatus } from '@/hooks/use-sync'
import { formatRelativeTime } from '@/lib/utils/formatters'

interface SyncIndicatorProps {
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function SyncIndicator({ showText = false, size = 'md' }: SyncIndicatorProps) {
  const { triggerSync, retryFailed } = useSync()
  const { 
    syncState, 
    pendingCount, 
    lastSynced, 
    statusText, 
    statusColor,
    isSyncing,
    hasFailed,
    isLocalOnly,
  } = useSyncStatus()

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  const iconSize = iconSizes[size]

  const renderIcon = () => {
    if (isSyncing) {
      return <Loader2 className={`${iconSize} animate-spin text-blue-600`} />
    }

    if (hasFailed) {
      return <AlertCircle className={`${iconSize} text-red-600`} />
    }

    if (isLocalOnly) {
      return <CloudOff className={`${iconSize} text-gray-400`} />
    }

    if (pendingCount > 0) {
      return (
        <div className="relative">
          <Cloud className={`${iconSize} text-amber-600`} />
          <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        </div>
      )
    }

    return <Check className={`${iconSize} text-green-600`} />
  }

  const tooltipContent = (
    <div className="text-sm">
      <p className="font-medium">{statusText}</p>
      {lastSynced && syncState === 'SYNCED' && (
        <p className="text-xs text-gray-500 mt-1">
          Last synced {formatRelativeTime(lastSynced)}
        </p>
      )}
    </div>
  )

  const handleClick = async () => {
    if (hasFailed) {
      await retryFailed()
    } else if (!isSyncing && !isLocalOnly) {
      await triggerSync()
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${hasFailed ? 'hover:bg-red-50' : ''}`}
            onClick={handleClick}
            disabled={isSyncing || isLocalOnly}
          >
            {renderIcon()}
            {showText && (
              <span className={`text-sm ${statusColor}`}>
                {statusText}
              </span>
            )}
            {hasFailed && (
              <RefreshCw className="h-3 w-3 text-red-600" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function SyncStatusBadge() {
  const { statusText, statusColor, isSyncing, hasFailed, isLocalOnly } = useSyncStatus()

  const bgColors: Record<string, string> = {
    'text-green-600': 'bg-green-100',
    'text-amber-600': 'bg-amber-100',
    'text-blue-600': 'bg-blue-100',
    'text-red-600': 'bg-red-100',
    'text-gray-500': 'bg-gray-100',
  }

  const bgColor = bgColors[statusColor] || 'bg-gray-100'

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bgColor} ${statusColor}`}>
      {isSyncing && <Loader2 className="h-3 w-3 animate-spin" />}
      {hasFailed && <AlertCircle className="h-3 w-3" />}
      {isLocalOnly && <CloudOff className="h-3 w-3" />}
      {!isSyncing && !hasFailed && !isLocalOnly && <Cloud className="h-3 w-3" />}
      {statusText}
    </span>
  )
}

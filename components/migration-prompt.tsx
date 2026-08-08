"use client"

import { useState } from 'react'
import { Loader2, Upload, Trash2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils/formatters'
import type { LocalDataSummary } from '@/lib/migration'

interface MigrationPromptProps {
  open: boolean
  localDataSummary: LocalDataSummary
  onMigrate: () => Promise<void>
  onStartFresh: () => Promise<void>
}

export function MigrationPrompt({
  open,
  localDataSummary,
  onMigrate,
  onStartFresh,
}: MigrationPromptProps) {
  const [isMigrating, setIsMigrating] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const handleMigrate = async () => {
    setIsMigrating(true)
    try {
      await onMigrate()
    } finally {
      setIsMigrating(false)
    }
  }

  const handleStartFresh = async () => {
    setIsClearing(true)
    try {
      await onStartFresh()
    } finally {
      setIsClearing(false)
    }
  }

  const isLoading = isMigrating || isClearing

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-[#2F6B66]">Import Your Budget Data?</DialogTitle>
          <DialogDescription className="text-[#4A4A4A]">
            We found existing budget data on this device. Would you like to import it to your new account?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="rounded-lg bg-gray-50 p-4 space-y-2">
            <DataRow
              label="Household"
              value={localDataSummary.hasHousehold ? <CheckCircle className="h-4 w-4 text-green-600" /> : '—'}
            />
            <DataRow
              label="Children"
              value={localDataSummary.childrenCount}
            />
            <DataRow
              label="Adults"
              value={localDataSummary.adultsCount}
            />
            <DataRow
              label="Budget Categories"
              value={localDataSummary.categoriesCount}
            />
            <DataRow
              label="Budget Items"
              value={localDataSummary.itemsCount}
            />
            <div className="border-t pt-2 mt-2">
              <DataRow
                label="Total Annual Budget"
                value={formatCurrency(localDataSummary.totalAnnual)}
                highlight
              />
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Importing will copy all your existing budget data to your new account.
            Starting fresh will delete this local data.
          </p>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleStartFresh}
            disabled={isLoading}
            className="flex-1"
          >
            {isClearing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Start Fresh
          </Button>
          <Button
            onClick={handleMigrate}
            disabled={isLoading}
            className="flex-1 bg-[#2F6B66] hover:bg-[#245651]"
          >
            {isMigrating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Import Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface DataRowProps {
  label: string
  value: React.ReactNode
  highlight?: boolean
}

function DataRow({ label, value, highlight = false }: DataRowProps) {
  return (
    <div className={`flex justify-between items-center text-sm ${highlight ? 'font-medium' : ''}`}>
      <span className="text-[#4A4A4A]">{label}</span>
      <span className={highlight ? 'text-[#2F6B66]' : 'text-gray-900'}>
        {typeof value === 'number' ? value : value}
      </span>
    </div>
  )
}

interface MigrationProgressProps {
  isOpen: boolean
  progress: number
  status: string
}

export function MigrationProgress({ isOpen, progress, status }: MigrationProgressProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-[#2F6B66]">Importing Your Data</DialogTitle>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#2F6B66]" />
          </div>

          <div className="space-y-2">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#63A8A3] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-center text-[#4A4A4A]">{status}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

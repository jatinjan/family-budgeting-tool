"use client"

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { logError } from '@/lib/utils/error-handler'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
    
    logError(error, {
      componentStack: errorInfo.componentStack,
    })
    
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      
      return <GlobalErrorFallback error={this.state.error} onRetry={this.handleRetry} />
    }

    return this.props.children
  }
}

interface GlobalErrorFallbackProps {
  error?: Error
  onRetry?: () => void
}

export function GlobalErrorFallback({ error, onRetry }: GlobalErrorFallbackProps) {
  const isDev = process.env.NODE_ENV === 'development'
  
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-teal-50 to-amber-50">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-xl text-[#2F6B66]">Something went wrong</CardTitle>
          <CardDescription className="text-[#4A4A4A]">
            We&apos;re sorry, but something unexpected happened. Please try refreshing the page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDev && error && (
            <div className="rounded-lg bg-gray-100 p-3 overflow-auto">
              <p className="text-xs font-mono text-red-600 break-all">
                {error.message}
              </p>
              {error.stack && (
                <pre className="text-xs font-mono text-gray-600 mt-2 whitespace-pre-wrap">
                  {error.stack.split('\n').slice(1, 5).join('\n')}
                </pre>
              )}
            </div>
          )}
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.location.href = '/'}
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
            <Button
              className="flex-1 bg-[#2F6B66] hover:bg-[#245651]"
              onClick={onRetry || (() => window.location.reload())}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface PageErrorFallbackProps {
  error?: Error
  reset?: () => void
  title?: string
  description?: string
}

export function PageErrorFallback({ 
  error, 
  reset, 
  title = "Something went wrong",
  description = "An error occurred while loading this page."
}: PageErrorFallbackProps) {
  const isDev = process.env.NODE_ENV === 'development'
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h2 className="text-lg font-semibold text-[#2F6B66] mb-2">{title}</h2>
        <p className="text-[#4A4A4A] mb-4">{description}</p>
        
        {isDev && error && (
          <p className="text-xs font-mono text-red-600 mb-4 break-all">
            {error.message}
          </p>
        )}
        
        <Button
          onClick={reset || (() => window.location.reload())}
          className="bg-[#2F6B66] hover:bg-[#245651]"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  )
}

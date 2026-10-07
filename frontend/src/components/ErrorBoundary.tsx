import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallbackName?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#93000a]/20 border border-[#ffb4ab]/30 rounded-2xl p-6 shadow-2xl h-full flex flex-col justify-center items-center text-center">
          <span className="text-3xl mb-2">⚠️</span>
          <h2 className="text-[#ffb4ab] font-bold text-lg mb-1">
            {this.props.fallbackName ? `Failed to load ${this.props.fallbackName}` : 'Component Error'}
          </h2>
          <p className="text-[#ffdad6] text-xs opacity-80 max-w-xs break-words">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
        </div>
      )
    }

    return this.props.children
  }
}

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center space-y-4 bg-zinc-950 text-zinc-200 rounded-3xl">
          <h2 className="text-xl font-black text-rose-500 uppercase tracking-widest">Beklenmeyen bir hata oluştu!</h2>
          <p className="text-sm text-zinc-400 font-medium whitespace-pre-wrap">
            {this.state.error?.message.toString()}
          </p>
          <button
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors"
            onClick={() => window.location.href = '/'}
          >
            Ana Sayfaya Dön
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

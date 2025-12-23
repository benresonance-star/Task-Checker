import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children?: ReactNode;
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
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white dark:bg-[#1e1e1e] rounded-container shadow-2xl p-8 border-2 border-google-red/20">
            <div className="w-20 h-20 bg-google-red/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-google-red" />
            </div>
            
            <h1 className="text-xl font-black uppercase tracking-wider text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h1>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
              The application encountered an unexpected error. We've been notified and are looking into it.
            </p>

            <div className="bg-gray-100 dark:bg-black/20 rounded-xl p-4 mb-8 text-left overflow-auto max-h-32">
              <code className="text-[10px] text-google-red font-mono break-all">
                {this.state.error?.message || 'Unknown error'}
              </code>
            </div>

            <Button 
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.children;
  }
}


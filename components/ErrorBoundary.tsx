import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isWebGLError = this.state.error?.message?.includes('WebGL');

      return (
        <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-200 p-8">
          <div className="max-w-2xl bg-slate-900 rounded-lg p-8 border border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <h1 className="text-2xl font-bold text-red-400">
                {isWebGLError ? 'WebGL Not Available' : 'Something Went Wrong'}
              </h1>
            </div>

            {isWebGLError ? (
              <div className="space-y-4">
                <p className="text-slate-300">
                  This application requires WebGL to render 3D graphics, but your browser cannot create a WebGL context.
                </p>

                <div className="bg-slate-800 rounded p-4 space-y-2">
                  <p className="font-semibold text-blue-400">Try these solutions:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400">
                    <li>Enable hardware acceleration in your browser settings</li>
                    <li>Update your graphics drivers</li>
                    <li>Try a different browser (Chrome, Firefox, Edge)</li>
                    <li>Restart your browser</li>
                    <li>Check if WebGL is enabled: visit <code className="text-blue-400">get.webgl.org</code></li>
                  </ul>
                </div>

                <div className="text-xs text-slate-500 mt-4 p-3 bg-slate-800 rounded">
                  <p className="font-mono">{this.state.error?.message}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-slate-300">An unexpected error occurred.</p>
                <div className="text-xs text-slate-500 mt-4 p-3 bg-slate-800 rounded font-mono">
                  {this.state.error?.message}
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-semibold"
                >
                  Reload Page
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

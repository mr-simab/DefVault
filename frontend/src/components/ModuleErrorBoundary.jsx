import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * ModuleErrorBoundary Component
 * Catches errors specific to a module and prevents cascade failures
 * Provides fault isolation between Enterprise and Personal modules
 */

class ModuleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const errorCount = this.state.errorCount + 1;

    this.setState({
      error,
      errorInfo,
      errorCount
    });

    // Log error for debugging
    console.error(`[Module Error - ${this.props.moduleName}]`, error, errorInfo);

    // Call error tracking callback if provided
    if (this.props.onError) {
      this.props.onError({
        module: this.props.moduleName,
        error: error.toString(),
        errorInfo: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        errorCount
      });
    }

    // If error count exceeds threshold, suggest logout
    if (errorCount > 3) {
      console.warn(`Module ${this.props.moduleName} exceeded error threshold (${errorCount}). Consider logout.`);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleLogout = () => {
    // Clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userAccount');
    
    // Redirect to login
    if (this.props.onLogout) {
      this.props.onLogout();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-8 max-w-2xl w-full mx-4">
            {/* Error Header */}
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-red-400 mb-2">⚠️ Module Error</h1>
              <p className="text-red-300">
                An error occurred in the <code className="bg-red-900/40 px-2 py-1 rounded">{this.props.moduleName}</code> module
              </p>
            </div>

            {/* Error Count Warning */}
            {this.state.errorCount > 1 && (
              <div className="bg-yellow-900/30 border border-yellow-600 rounded p-4 mb-6">
                <p className="text-yellow-300">
                  <strong>Warning:</strong> This is error #{this.state.errorCount} in this session.
                  {this.state.errorCount > 3 && ' We recommend logging out and trying again.'}
                </p>
              </div>
            )}

            {/* Error Message */}
            {this.state.error && (
              <div className="bg-slate-800 rounded p-4 mb-6 max-h-32 overflow-auto">
                <p className="text-red-200 font-mono text-sm">{this.state.error.toString()}</p>
              </div>
            )}

            {/* Stack Trace (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mb-6 bg-slate-800 rounded p-4 cursor-pointer">
                <summary className="text-slate-300 hover:text-slate-200 font-semibold">
                  Stack Trace (Dev Only)
                </summary>
                <pre className="text-xs text-slate-400 mt-3 overflow-auto max-h-40">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition"
              >
                🔄 Try Again
              </button>
              <button
                onClick={this.handleLogout}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition"
              >
                🚪 Logout
              </button>
            </div>

            {/* Help Text */}
            <p className="text-slate-400 text-sm mt-6 text-center">
              If the problem persists, please contact support or try clearing your browser cache.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * withModuleErrorBoundary HOC
 * Wraps a component with error boundary
 */
export const withModuleErrorBoundary = (Component, moduleName) => {
  return (props) => (
    <ModuleErrorBoundary moduleName={moduleName} {...props}>
      <Component {...props} />
    </ModuleErrorBoundary>
  );
};

export default ModuleErrorBoundary;

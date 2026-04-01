import React, { Component, ErrorInfo } from 'react';
import { Button, Result } from 'antd';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/admin/dashboard';
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <Result
          status="500"
          title="Something went wrong"
          subTitle={
            <div style={{ maxWidth: 400 }}>
              <p style={{ color: '#6b7280', marginBottom: 8 }}>
                An unexpected error occurred. The issue has been logged.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <pre style={{ fontSize: 11, background: '#f3f4f6', padding: 12, borderRadius: 8, textAlign: 'left', overflowX: 'auto', color: '#dc2626' }}>
                  {this.state.error.message}
                </pre>
              )}
            </div>
          }
          extra={
            <Button type="primary" onClick={this.handleReset} style={{ background: '#7c3aed', borderColor: '#7c3aed' }}>
              Return to Dashboard
            </Button>
          }
        />
      </div>
    );
  }
}

export default ErrorBoundary;
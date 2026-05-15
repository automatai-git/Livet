import React from 'react';
import { Link } from 'react-router-dom';

// Route-level error boundary. Catches render-time crashes in any descendant
// and shows a recovery card instead of a blank screen. The Dashboard is the
// only safe fallback target — every other page might be the one that broke.
class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const message = this.state.error?.message || 'Something unexpected happened.';
    return (
      <div className="error-boundary-shell">
        <div className="error-boundary-card">
          <p className="label">Page crashed</p>
          <h2 className="heading-serif" style={{ fontSize: '1.4rem', marginBottom: 8 }}>
            We hit a snag
          </h2>
          <p className="muted-row" style={{ marginBottom: 16 }}>{message}</p>
          <div className="error-boundary-actions">
            <button type="button" className="error-boundary-btn" onClick={this.handleReload}>
              Reload page
            </button>
            <Link to="/" className="error-boundary-btn secondary">Back to dashboard</Link>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

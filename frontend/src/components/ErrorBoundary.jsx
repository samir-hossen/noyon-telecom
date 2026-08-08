import { Component } from 'react';
import { reportError } from '../analytics.js';

// Catches JS errors anywhere in the child component tree and shows a
// friendly fallback instead of a blank white screen. This only catches
// render/lifecycle errors in class-eligible React trees (not errors inside
// event handlers, async code, or SSR) — those are handled locally where
// they occur (e.g. try/catch + toast in page components).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    reportError(error, { fatal: true, componentStack: info?.componentStack });
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="container"
          style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '80px 28px',
          }}
        >
          <div style={{ fontSize: '2.4rem', marginBottom: 8 }}>😕</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ color: 'var(--muted)', marginBottom: 24, maxWidth: 420 }}>
            We hit an unexpected error. It's not your fault — please try reloading the page.
          </p>
          <button className="btn btn-primary" onClick={this.handleReload}>
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

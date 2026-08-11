import { Component } from 'react';
import { reportError } from '../analytics.js';
import translations from '../i18n/translations.js';

// This ErrorBoundary deliberately wraps LanguageProvider in main.jsx (so it
// can also catch an error thrown by the provider itself), which means its
// fallback UI renders with no LanguageProvider ancestor — useLanguage()
// here would throw its own "must be used within a LanguageProvider" error,
// crashing the crash screen. Reading localStorage + the dictionary
// directly instead keeps this fallback resilient even if app context is
// part of what broke.
function t(key) {
  let lang = 'en';
  try {
    lang = localStorage.getItem('nt-language') || 'en';
  } catch {
    // localStorage unavailable — default to English, harmless.
  }
  return translations[lang]?.[key] ?? translations.en[key] ?? key;
}

function ErrorFallback({ onReload }) {
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
        {t('errorBoundary.title')}
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: 24, maxWidth: 420 }}>
        {t('errorBoundary.sub')}
      </p>
      <button className="btn btn-primary" onClick={onReload}>
        {t('errorBoundary.reload')}
      </button>
    </div>
  );
}

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
      return <ErrorFallback onReload={this.handleReload} />;
    }

    return this.props.children;
  }
}

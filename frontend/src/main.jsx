import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import PullToRefresh from './components/PullToRefresh.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { WishlistProvider } from './context/WishlistContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { initAnalytics, initErrorTracking, initGlobalErrorTracking } from './analytics.js';
import { initMetaPixel, initTikTokPixel } from './pixels.js';
import './index.css';

// Browsers restore the previous scroll position on reload by default
// ("auto") — for a client-rendered app that content isn't painted yet at
// that moment, so the restore lands wherever the page's height happens to
// be mid-render (often near the bottom, since the page is still short
// before data/images load in), not where the user actually was. Taking
// manual control and explicitly starting at the top avoids that.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

initAnalytics();
initMetaPixel();
initTikTokPixel();
initErrorTracking();
initGlobalErrorTracking();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <ToastProvider>
                  <PullToRefresh />
                  <App />
                </ToastProvider>
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

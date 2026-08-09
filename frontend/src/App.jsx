import { lazy, Suspense, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import SupportWidget from './components/SupportWidget.jsx';
import MobileBottomNav from './components/MobileBottomNav.jsx';
import { RequireAuth, RequireAdmin } from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';

// Home stays eagerly bundled since almost every visit starts here — no
// point lazy-loading the one page everyone needs immediately. Everything
// else ships as its own chunk, fetched only when that route is visited,
// so the initial JS payload (and first-load time) stays small.
import Home from './pages/Home.jsx';
const Shop = lazy(() => import('./pages/Shop.jsx'));
const ProductDetail = lazy(() => import('./pages/ProductDetail.jsx'));
const Cart = lazy(() => import('./pages/Cart.jsx'));
const Wishlist = lazy(() => import('./pages/Wishlist.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation.jsx'));
const Invoice = lazy(() => import('./pages/Invoice.jsx'));
const Orders = lazy(() => import('./pages/Orders.jsx'));
const DealerDashboard = lazy(() => import('./pages/DealerDashboard.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const AdminLogin = lazy(() => import('./pages/AdminLogin.jsx'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'));
const Terms = lazy(() => import('./pages/Terms.jsx'));
const RefundPolicy = lazy(() => import('./pages/RefundPolicy.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const AboutUs = lazy(() => import('./pages/AboutUs.jsx'));
const RequestQuote = lazy(() => import('./pages/RequestQuote.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

function RouteFallback() {
  return (
    <div className="container" style={{ padding: '100px 28px', textAlign: 'center', color: '#6b5f59' }}>
      Loading…
    </div>
  );
}

function VerifyEmailBanner() {
  const { user, resendVerification } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sent, setSent] = useState(false);

  if (!user || user.emailVerified || dismissed) return null;

  return (
    <div
      style={{
        background: '#fff3e0',
        borderBottom: '1px solid #f0d9b5',
        padding: '10px 20px',
        fontSize: '0.85rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
      }}
    >
      <span>Please verify your email address.</span>
      {sent ? (
        <strong>Verification email sent — check your inbox.</strong>
      ) : (
        <button
          className="remove-link"
          onClick={() => resendVerification().then(() => setSent(true))}
          style={{ fontWeight: 600 }}
        >
          Resend verification email
        </button>
      )}
      <button className="remove-link" onClick={() => setDismissed(true)}>Dismiss</button>
    </div>
  );
}

export default function App() {
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Navbar />
      <VerifyEmailBanner />
      <main id="main-content">
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/request-quote" element={<RequestQuote />} />
          {/* Checkout and order confirmation are open to guests too — cart items
              are either read from the server cart (logged in) or sent straight
              from the browser's local guest cart. See CartContext for details. */}
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
          <Route path="/invoice/:id" element={<Invoice />} />
          <Route
            path="/orders"
            element={
              <RequireAuth>
                <Orders />
              </RequireAuth>
            }
          />
          <Route
            path="/dealer"
            element={
              <RequireAuth>
                <DealerDashboard />
              </RequireAuth>
            }
          />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <Admin />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>
      <Footer />
      <SupportWidget />
      <MobileBottomNav />
    </>
  );
}

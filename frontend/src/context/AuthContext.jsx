import { createContext, useContext, useEffect, useState } from 'react';
import { api, getRecaptchaToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auth now lives in an httpOnly cookie the browser sends automatically,
    // so there's no token to check for locally — just ask the backend.
    api
      .get('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const recaptchaToken = await getRecaptchaToken('login');
    const data = await api.post('/auth/login', { email, password, recaptchaToken });
    if (data.twoFARequired) {
      // Caller (Login page) is responsible for prompting for the 6-digit
      // code and calling verifyTwoFA — we're not logged in yet.
      return { twoFARequired: true, pendingId: data.pendingId };
    }
    setUser(data.user);
    return { user: data.user };
  }

  async function verifyTwoFA(pendingId, code) {
    const data = await api.post('/auth/2fa/verify', { pendingId, code });
    setUser(data.user);
    return data.user;
  }

  async function register(name, email, password, dealerFields) {
    const recaptchaToken = await getRecaptchaToken('register');
    const data = await api.post('/auth/register', { name, email, password, recaptchaToken, ...dealerFields });
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => {});
    setUser(null);
  }

  // Always resolves the same way regardless of whether the email exists —
  // the backend intentionally hides that to prevent account enumeration.
  async function forgotPassword(email) {
    return api.post('/auth/forgot-password', { email });
  }

  async function resetPassword(token, password) {
    return api.post('/auth/reset-password', { token, password });
  }

  async function verifyEmail(token) {
    const data = await api.post('/auth/verify-email', { token });
    // Reflect the verified state immediately if this is the logged-in user.
    setUser((u) => (u ? { ...u, emailVerified: true } : u));
    return data;
  }

  async function resendVerification() {
    return api.post('/auth/resend-verification', {});
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, verifyTwoFA, register, logout, forgotPassword, resetPassword, verifyEmail, resendVerification, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

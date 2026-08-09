import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePageMeta } from '../hooks/usePageTitle';

export default function Register() {
  const [accountType, setAccountType] = useState('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dealerSuccess, setDealerSuccess] = useState(false);
  const { register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  usePageMeta('Create Account', 'Create a Noyon Telecom account or register as a wholesale dealer.');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return setError('Password must include at least one letter and one number.');
    }
    if (accountType === 'dealer' && (!businessName.trim() || !phone.trim())) {
      return setError('Business name and phone number are required for a dealer account.');
    }
    setBusy(true);
    try {
      const dealerFields = accountType === 'dealer' ? { accountType, businessName, phone, address } : {};
      const user = await register(name, email, password, dealerFields);
      if (user.role === 'dealer') {
        setDealerSuccess(true);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (dealerSuccess) {
    return (
      <div className="container" style={{ padding: '60px 28px 100px' }}>
        <div className="form-panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: 10 }}>✅</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 10 }}>
            Dealer application submitted
          </h2>
          <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
            Thanks for registering as a Noyon Telecom dealer! Your account is <strong>pending approval</strong> —
            our team typically reviews applications within 24 hours. You can browse and shop in the meantime;
            dealer pricing will unlock automatically once approved.
          </p>
          <Link to="/" className="btn btn-primary">Continue to homepage</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '60px 28px 100px' }}>
      <div className="form-panel">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>
          {accountType === 'dealer' ? t('dealer.registerTitle') : 'Create your account'}
        </h2>
        <p style={{ color: 'var(--muted)', marginBottom: 20, fontSize: '0.9rem' }}>
          {accountType === 'dealer'
            ? 'Get wholesale dealer pricing, bulk discounts, and priority stock access.'
            : 'Join Noyon Telecom for faster checkout and order tracking.'}
        </p>

        <div className="account-type-toggle">
          <button
            type="button"
            className={accountType === 'customer' ? 'active' : ''}
            onClick={() => setAccountType('customer')}
          >
            Customer Account
          </button>
          <button
            type="button"
            className={accountType === 'dealer' ? 'active' : ''}
            onClick={() => setAccountType('dealer')}
          >
            🏪 Dealer Account
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="reg-name">Full name</label>
            <input id="reg-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Rahman" />
          </div>
          <div className="field">
            <label htmlFor="reg-email">Email</label>
            <input id="reg-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>

          {accountType === 'dealer' && (
            <>
              <div className="form-step-label">Business details</div>
              <div className="field">
                <label htmlFor="reg-business">{t('dealer.businessName')}</label>
                <input id="reg-business" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Islam Mobile Care" />
              </div>
              <div className="field">
                <label htmlFor="reg-phone">{t('dealer.phone')}</label>
                <input id="reg-phone" required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
              </div>
              <div className="field">
                <label htmlFor="reg-address">{t('dealer.address')} (optional)</label>
                <input id="reg-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Shop address, area, city" />
              </div>
              <div className="form-step-label">Set your password</div>
            </>
          )}

          <div className="field">
            {accountType !== 'dealer' && <label htmlFor="reg-password">Password</label>}
            {accountType === 'dealer' && <label className="sr-only" htmlFor="reg-password">Password</label>}
            <input id="reg-password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters, with a letter and number" />
          </div>
          <button className="btn btn-berry btn-block" disabled={busy}>
            {busy ? 'Creating account…' : accountType === 'dealer' ? 'Submit dealer application' : 'Create account'}
          </button>
        </form>

        <p className="form-note">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

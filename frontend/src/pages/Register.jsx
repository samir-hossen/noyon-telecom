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

  usePageMeta(t('register.pageTitle'), t('register.pageMeta'));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError(t('register.passwordMinLength'));
    if (accountType === 'dealer' && (!businessName.trim() || !phone.trim())) {
      return setError(t('register.dealerFieldsRequired'));
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
            {t('register.dealerAppSubmitted')}
          </h2>
          <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
            {t('register.dealerAppPre')} <strong>{t('register.dealerAppPending')}</strong>{' '}
            {t('register.dealerAppPost')}
          </p>
          <Link to="/" className="btn btn-primary">{t('register.continueHome')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '60px 28px 100px' }}>
      <div className="form-panel">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6 }}>
          {accountType === 'dealer' ? t('dealer.registerTitle') : t('register.createAccountTitle')}
        </h2>
        <p style={{ color: 'var(--muted)', marginBottom: 20, fontSize: '0.9rem' }}>
          {accountType === 'dealer' ? t('register.dealerSub') : t('register.customerSub')}
        </p>

        <div className="account-type-toggle">
          <button
            type="button"
            className={accountType === 'customer' ? 'active' : ''}
            onClick={() => setAccountType('customer')}
          >
            {t('register.customerToggle')}
          </button>
          <button
            type="button"
            className={accountType === 'dealer' ? 'active' : ''}
            onClick={() => setAccountType('dealer')}
          >
            🏪 {t('register.dealerToggle')}
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="reg-name">{t('checkout.fullName')}</label>
            <input id="reg-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t('checkout.fullNamePlaceholder')} />
          </div>
          <div className="field">
            <label htmlFor="reg-email">{t('auth.email')}</label>
            <input id="reg-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>

          {accountType === 'dealer' && (
            <>
              <div className="form-step-label">{t('register.businessDetailsStep')}</div>
              <div className="field">
                <label htmlFor="reg-business">{t('dealer.businessName')}</label>
                <input id="reg-business" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder={t('register.businessNamePlaceholder')} />
              </div>
              <div className="field">
                <label htmlFor="reg-phone">{t('dealer.phone')}</label>
                <input id="reg-phone" required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
              </div>
              <div className="field">
                <label htmlFor="reg-address">{t('register.addressOptional', null, { label: t('dealer.address') })}</label>
                <input id="reg-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('register.addressPlaceholder')} />
              </div>
              <div className="form-step-label">{t('register.setPasswordStep')}</div>
            </>
          )}

          <div className="field">
            {accountType !== 'dealer' && <label htmlFor="reg-password">{t('auth.password')}</label>}
            {accountType === 'dealer' && <label className="sr-only" htmlFor="reg-password">{t('auth.password')}</label>}
            <input id="reg-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('register.passwordPlaceholder')} />
          </div>
          <button className="btn btn-berry btn-block" disabled={busy}>
            {busy ? t('register.creatingAccount') : accountType === 'dealer' ? t('register.submitDealerApp') : t('register.createAccountBtn')}
          </button>
        </form>

        <p className="form-note">
          {t('register.alreadyHaveAccount')} <Link to="/login">{t('nav.signIn')}</Link>
        </p>
      </div>
    </div>
  );
}

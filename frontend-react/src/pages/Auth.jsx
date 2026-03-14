import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import './Auth.css';

const Auth = ({ showToast }) => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'login' ? 'login' : 'register');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { t } = useLanguage();

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '' });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(loginForm.email, loginForm.password, { adminOnly: true });
      if (result.success) {
        showToast(t('auth.toasts.welcomeBack'), 'success');
        navigate('/admin');
      } else {
        showToast(result.error, 'error');
      }
    } catch {
      showToast(t('auth.toasts.loginFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await register(registerForm.name, registerForm.email, registerForm.password);
      if (result.success) {
        showToast(t('auth.toasts.accountCreated'), 'success');
        navigate('/admin');
      } else {
        showToast(result.error, 'error');
      }
    } catch {
      showToast(t('auth.toasts.registerFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            {t('auth.createAccountTab')}
          </button>
          <button
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            {t('auth.signInTab')}
          </button>
        </div>

        <div className="auth-form">
          {activeTab === 'register' ? (
            <>
              <h2>{t('auth.createRetailerAccount')}</h2>
              <p>{t('auth.createRetailerSubtitle')}</p>
              <form onSubmit={handleRegisterSubmit}>
                <div className="form-group">
                  <label htmlFor="regName">{t('auth.fullName')}</label>
                  <div className="input-group">
                    <User size={20} />
                    <input
                      type="text"
                      id="regName"
                      className="form-control"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      placeholder={t('auth.fullNamePlaceholder')}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="regEmail">{t('auth.email')}</label>
                  <div className="input-group">
                    <Mail size={20} />
                    <input
                      type="email"
                      id="regEmail"
                      className="form-control"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                      placeholder={t('auth.emailPlaceholder')}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="regPassword">{t('auth.password')}</label>
                  <div className="input-group">
                    <Lock size={20} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="regPassword"
                      className="form-control"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      placeholder={t('auth.passwordPlaceholder')}
                      minLength={6}
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                  {loading ? t('auth.createAccountLoading') : t('auth.createAccount')}
                </button>
              </form>
              <p className="auth-switch">
                {t('auth.alreadyHaveAccount')}{' '}
                <button className="link-btn" onClick={() => setActiveTab('login')}>{t('auth.signInLink')}</button>
              </p>
            </>
          ) : (
            <>
              <h2>{t('auth.retailerSignIn')}</h2>
              <p>{t('auth.retailerSignInSubtitle')}</p>
              <form onSubmit={handleLoginSubmit}>
                <div className="form-group">
                  <label htmlFor="loginEmail">{t('auth.email')}</label>
                  <div className="input-group">
                    <Mail size={20} />
                    <input
                      type="email"
                      id="loginEmail"
                      className="form-control"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                      placeholder={t('auth.loginEmailPlaceholder')}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="loginPassword">{t('auth.password')}</label>
                  <div className="input-group">
                    <Lock size={20} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="loginPassword"
                      className="form-control"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      placeholder={t('auth.loginPasswordPlaceholder')}
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                  {loading ? t('auth.signInLoading') : t('auth.signInTab')}
                </button>
              </form>
              <p className="auth-switch">
                {t('auth.newHere')}{' '}
                <button className="link-btn" onClick={() => setActiveTab('register')}>{t('auth.createAccountLink')}</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;


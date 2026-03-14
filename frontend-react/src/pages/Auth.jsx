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
        showToast(t('Welcome back!'), 'success');
        navigate('/admin');
      } else {
        showToast(result.error, 'error');
      }
    } catch {
      showToast(t('Login failed. Please try again.'), 'error');
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
        showToast(t('Account created! Welcome to DukaanSaathi.'), 'success');
        navigate('/admin');
      } else {
        showToast(result.error, 'error');
      }
    } catch {
      showToast(t('Registration failed. Please try again.'), 'error');
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
            {t('Create Account')}
          </button>
          <button
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            {t('Sign In')}
          </button>
        </div>

        <div className="auth-form">
          {activeTab === 'register' ? (
            <>
              <h2>{t('Create Retailer Account')}</h2>
              <p>{t('Register with your email to manage your shop with DukaanSaathi.')}</p>
              <form onSubmit={handleRegisterSubmit}>
                <div className="form-group">
                  <label htmlFor="regName">{t('Full Name')}</label>
                  <div className="input-group">
                    <User size={20} />
                    <input
                      type="text"
                      id="regName"
                      className="form-control"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      placeholder={t('Your full name')}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="regEmail">{t('Email')}</label>
                  <div className="input-group">
                    <Mail size={20} />
                    <input
                      type="email"
                      id="regEmail"
                      className="form-control"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                      placeholder="you@gmail.com"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="regPassword">{t('Password')}</label>
                  <div className="input-group">
                    <Lock size={20} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="regPassword"
                      className="form-control"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      placeholder={t('Min. 6 characters')}
                      minLength={6}
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                  {loading ? t('Creating account...') : t('Create Account')}
                </button>
              </form>
              <p className="auth-switch">
                {t('Already have an account?')}{' '}
                <button className="link-btn" onClick={() => setActiveTab('login')}>{t('Sign In')}</button>
              </p>
            </>
          ) : (
            <>
              <h2>{t('Retailer Sign In')}</h2>
              <p>{t('Sign in to manage your retail shop.')}</p>
              <form onSubmit={handleLoginSubmit}>
                <div className="form-group">
                  <label htmlFor="loginEmail">{t('Email')}</label>
                  <div className="input-group">
                    <Mail size={20} />
                    <input
                      type="email"
                      id="loginEmail"
                      className="form-control"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                      placeholder={t('Enter your email')}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="loginPassword">{t('Password')}</label>
                  <div className="input-group">
                    <Lock size={20} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="loginPassword"
                      className="form-control"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      placeholder={t('Enter your password')}
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                  {loading ? t('Signing in...') : t('Sign In')}
                </button>
              </form>
              <p className="auth-switch">
                {t('New here?')}{' '}
                <button className="link-btn" onClick={() => setActiveTab('register')}>{t('Create an account')}</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;


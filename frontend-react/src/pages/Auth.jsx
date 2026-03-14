import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Auth = ({ showToast }) => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'login' ? 'login' : 'register');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '' });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(loginForm.email, loginForm.password, { adminOnly: true });
      if (result.success) {
        showToast('Welcome back!', 'success');
        navigate('/admin');
      } else {
        showToast(result.error, 'error');
      }
    } catch {
      showToast('Login failed. Please try again.', 'error');
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
        showToast('Account created! Welcome to DukaanSaathi.', 'success');
        navigate('/admin');
      } else {
        showToast(result.error, 'error');
      }
    } catch {
      showToast('Registration failed. Please try again.', 'error');
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
            Create Account
          </button>
          <button
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            Sign In
          </button>
        </div>

        <div className="auth-form">
          {activeTab === 'register' ? (
            <>
              <h2>Create Retailer Account</h2>
              <p>Register with your email to manage your shop with DukaanSaathi.</p>
              <form onSubmit={handleRegisterSubmit}>
                <div className="form-group">
                  <label htmlFor="regName">Full Name</label>
                  <div className="input-group">
                    <User size={20} />
                    <input
                      type="text"
                      id="regName"
                      className="form-control"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      placeholder="Your full name"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="regEmail">Email</label>
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
                  <label htmlFor="regPassword">Password</label>
                  <div className="input-group">
                    <Lock size={20} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="regPassword"
                      className="form-control"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      placeholder="Min. 6 characters"
                      minLength={6}
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
              <p className="auth-switch">
                Already have an account?{' '}
                <button className="link-btn" onClick={() => setActiveTab('login')}>Sign In</button>
              </p>
            </>
          ) : (
            <>
              <h2>Retailer Sign In</h2>
              <p>Sign in to manage your retail shop.</p>
              <form onSubmit={handleLoginSubmit}>
                <div className="form-group">
                  <label htmlFor="loginEmail">Email</label>
                  <div className="input-group">
                    <Mail size={20} />
                    <input
                      type="email"
                      id="loginEmail"
                      className="form-control"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="loginPassword">Password</label>
                  <div className="input-group">
                    <Lock size={20} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="loginPassword"
                      className="form-control"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      placeholder="Enter your password"
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
              <p className="auth-switch">
                New here?{' '}
                <button className="link-btn" onClick={() => setActiveTab('register')}>Create an account</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;


import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, LogOut, Menu, X, Store, LayoutDashboard, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import './Navbar.css';

const Navbar = ({ showToast }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const showBackButton = location.pathname === '/auth';

  const handleLogout = () => {
    logout();
    showToast(t('toasts.loggedOut'), 'success');
    setIsMenuOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navLinks = user && isAdmin()
    ? [{ path: '/admin', label: t('nav.dashboard'), icon: <LayoutDashboard size={16} /> }]
    : [{ path: '/', label: t('nav.home') }];

  return (
    <nav className="navbar">
      <div className="nav-container">
        {showBackButton && (
          <button className="nav-back-btn" onClick={() => navigate(-1)} aria-label={t('nav.goBack')}>
            <ArrowLeft size={18} />
            <span>{t('nav.back')}</span>
          </button>
        )}

        <Link to="/" className="nav-logo">
          <Store size={24} />
          <span className="brand-wordmark" aria-label="DukaanSaathi">
            <span className="brand-dukaan">Dukaan</span>
            <span className="brand-saathi">Saathi</span>
          </span>
        </Link>

        <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          <label className="nav-language" htmlFor="language-select">
            <span>{t('nav.languageLabel')}</span>
            <select
              id="language-select"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              <option value="en">{t('common.english')}</option>
              <option value="hi">{t('common.hindi')}</option>
            </select>
          </label>
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
          {user ? (
            <div className="nav-user">
              <span className="user-name">{t('nav.greeting', { name: user.name })}</span>
              <button onClick={handleLogout} className="nav-link logout-btn">
                <LogOut size={16} />
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className={`nav-link ${isActive('/auth') ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              <User size={16} />
              {t('nav.login')}
            </Link>
          )}
        </div>

        <button
          className="nav-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={t('nav.toggleMenu')}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  );
};

export default Navbar; 
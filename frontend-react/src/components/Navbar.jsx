import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, LogOut, Menu, X, Store, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const Navbar = ({ showToast }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully', 'success');
    setIsMenuOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navLinks = user && isAdmin()
    ? [{ path: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={16} /> }]
    : [{ path: '/', label: 'Home' }];

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <Store size={24} />
          <span>VyaparAI</span>
        </Link>

        <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
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
              <span className="user-name">Hi, {user.name}</span>
              <button onClick={handleLogout} className="nav-link logout-btn">
                <LogOut size={16} />
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className={`nav-link ${isActive('/auth') ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              <User size={16} />
              Login
            </Link>
          )}
        </div>

        <button
          className="nav-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  );
};

export default Navbar; 
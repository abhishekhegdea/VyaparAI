import { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../config/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await apiService.getProfile();
          setUser(response.data.user);
        } catch (error) {
          console.error('Auth check failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email, password, options = {}) => {
    try {
      const shouldUseAdminLogin = options.adminOnly === true;
      const response = shouldUseAdminLogin
        ? await apiService.adminLogin({ email, password })
        : await apiService.login({ email, password });
      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      const isNetworkError = !error.response;
      return {
        success: false,
        error: isNetworkError
          ? 'Cannot connect to server right now. Please wait a few seconds and try again.'
          : (error.response?.data?.error || 'Login failed')
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await apiService.register({ name, email, password });
      const { token: newToken, user: userData } = response.data;

      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);

      return { success: true };
    } catch (error) {
      const isNetworkError = !error.response;
      return {
        success: false,
        error: isNetworkError
          ? 'Cannot connect to server right now. Please wait a few seconds and try again.'
          : (error.response?.data?.error || 'Registration failed')
      };
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('token');
      setToken(null);
    }
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const isAuthenticated = () => {
    return !!user;
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAdmin,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 
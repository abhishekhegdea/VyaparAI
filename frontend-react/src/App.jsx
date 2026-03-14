import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Admin from './pages/Admin';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoadingScreen from './components/LoadingScreen';
import Toast from './components/Toast';
import ThreeSceneBackground from './components/ThreeSceneBackground';
import './App.css';

const RetailerProtectedRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin()) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

const AppRoutes = ({ showToast }) => {
  const { user, isAdmin } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user && isAdmin() ? <Navigate to="/admin" replace /> : <Home />} />
      <Route path="/auth" element={<Auth showToast={showToast} />} />
      <Route
        path="/admin"
        element={(
          <RetailerProtectedRoute>
            <Admin showToast={showToast} />
          </RetailerProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to={user && isAdmin() ? '/admin' : '/auth'} replace />} />
    </Routes>
  );
};

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const shownWarningKeysRef = useRef(new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const dismissToast = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  };

  const showToast = (message, type = 'info') => {
    const normalizedMessage = String(message || '').trim();
    if (!normalizedMessage) {
      return;
    }

    const warningKey = `${type}:${normalizedMessage.toLowerCase()}`;
    // Warning toasts should pop once per app session and remain until manually dismissed.
    if (type === 'warning' && shownWarningKeysRef.current.has(warningKey)) {
      return;
    }

    if (type === 'warning') {
      shownWarningKeysRef.current.add(warningKey);
    }

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    setToast({ message: normalizedMessage, type });

    if (type !== 'warning') {
      toastTimerRef.current = setTimeout(() => {
        setToast(null);
        toastTimerRef.current = null;
      }, 3200);
    }
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <AuthProvider>
      <Router>
          <div className="App">
            <ThreeSceneBackground className="app-ambient-scene" density="ambient" />
            <Navbar showToast={showToast} />
            <main className="main-content">
              <AppRoutes showToast={showToast} />
            </main>
            {toast && <Toast message={toast.message} type={toast.type} onClose={dismissToast} />}
          </div>
        </Router>
    </AuthProvider>
  );
}

export default App;

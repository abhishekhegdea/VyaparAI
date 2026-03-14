import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoadingScreen from './components/LoadingScreen';
import Toast from './components/Toast';
import './App.css';

const Home = lazy(() => import('./pages/Home'));
const Auth = lazy(() => import('./pages/Auth'));
const Admin = lazy(() => import('./pages/Admin'));
const ThreeSceneBackground = lazy(() => import('./components/ThreeSceneBackground'));

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

const AppFrame = ({ showToast, toast, dismissToast }) => {
  const location = useLocation();
  const [allowAmbientScene] = useState(() => {
    if (typeof window === 'undefined') return false;
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowCpu = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 0) > 0 && navigator.hardwareConcurrency <= 4;
    const smallScreen = window.innerWidth <= 900;
    return !reducedMotion && !lowCpu && !smallScreen;
  });

  const shouldRenderAmbientScene = allowAmbientScene && location.pathname !== '/admin';

  return (
    <div className="App">
      {shouldRenderAmbientScene && (
        <Suspense fallback={null}>
          <ThreeSceneBackground className="app-ambient-scene" density="ambient" />
        </Suspense>
      )}
      <Navbar showToast={showToast} />
      <main className="main-content">
        <Suspense fallback={<LoadingScreen />}>
          <AppRoutes showToast={showToast} />
        </Suspense>
      </main>
      {toast && <Toast message={toast.message} type={toast.type} onClose={dismissToast} />}
    </div>
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
        <AppFrame showToast={showToast} toast={toast} dismissToast={dismissToast} />
      </Router>
    </AuthProvider>
  );
}

export default App;

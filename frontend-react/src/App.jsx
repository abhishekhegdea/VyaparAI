import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Admin from './pages/Admin';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoadingScreen from './components/LoadingScreen';
import Toast from './components/Toast';
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <AuthProvider>
      <Router>
          <div className="App">
            <Navbar showToast={showToast} />
            <main className="main-content">
              <AppRoutes showToast={showToast} />
            </main>
            {toast && <Toast message={toast.message} type={toast.type} />}
          </div>
        </Router>
    </AuthProvider>
  );
}

export default App;

import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import AuthLoading from './components/AuthLoading.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');
  const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password', '/change-password'].some(path => location.pathname.startsWith(path));
  const hideNavFooter = isDashboard || isAuthPage;

  return (
    <div className="min-h-screen flex flex-col bg-night">
      {!hideNavFooter && <Navbar />}
      <main className={isDashboard ? 'flex-1 flex' : 'flex-1'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/change-password"
            element={
              <Protected>
                <ChangePassword />
              </Protected>
            }
          />
          <Route
            path="/dashboard"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!hideNavFooter && <Footer />}
    </div>
  );
}
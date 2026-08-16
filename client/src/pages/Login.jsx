import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, LockKeyhole, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import FormField from '../components/FormField.jsx';
import { getErrorMessage } from '../api.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedIn = await login(form.email, form.password);
      navigate(loggedIn?.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Log in to continue to SpencerSBM">
      {error && (
        <div className="flex items-start gap-3 bg-[#e0645a]/10 border border-[#e0645a]/30 text-[#ff8a80] text-[0.9rem] rounded-[12px] px-4 py-3 mb-6">
          <AlertCircle size={18} strokeWidth={1.9} className="shrink-0 mt-[1px]" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <FormField
          label="Email Address"
          type="email"
          id="email"
          value={form.email}
          placeholder="you@example.com"
          icon={Mail}
          autoComplete="email"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <FormField
          label="Password"
          type="password"
          id="password"
          value={form.password}
          placeholder="Enter your password"
          icon={LockKeyhole}
          autoComplete="current-password"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <div className="flex justify-end mb-6">
          <Link to="/forgot-password" className="text-[0.85rem] text-gold hover:text-gold-light">
            Forgot password?
          </Link>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full btn-gold py-4 text-[1.05rem] rounded-[14px] disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(212,175,55,0.4)] transition-all duration-300 flex items-center justify-center gap-2"
        >
          {loading && <span className="spinner inline-block" />}
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="flex items-center gap-3 my-7">
        <div className="flex-1 h-[1px] bg-softline" />
        <span className="text-[0.78rem] text-faint">New to SpencerSBM?</span>
        <div className="flex-1 h-[1px] bg-softline" />
      </div>

      <p className="text-center text-muted text-[0.95rem]">
        Create an account{' '}
        <Link
          to="/register"
          className="text-gold underline underline-offset-4 decoration-gold/50 hover:text-gold-light hover:decoration-gold"
        >
          here
        </Link>
      </p>

      <div className="flex items-center justify-center gap-2 mt-6 text-[0.8rem] text-subtle">
        <ShieldCheck size={15} strokeWidth={1.8} />
        Protected by encryption · Your data stays private
      </div>
    </AuthLayout>
  );
}
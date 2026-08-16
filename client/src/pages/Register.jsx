import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, LockKeyhole, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import FormField from '../components/FormField.jsx';
import { getErrorMessage } from '../api.js';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create Your Account" subtitle="Get started with SpencerSBM in seconds">
      {error && (
        <div className="flex items-start gap-3 bg-[#e0645a]/10 border border-[#e0645a]/30 text-[#ff8a80] text-[0.9rem] rounded-[12px] px-4 py-3 mb-6">
          <AlertCircle size={18} strokeWidth={1.9} className="shrink-0 mt-[1px]" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <FormField
          label="Full Name"
          type="text"
          id="name"
          value={form.name}
          placeholder="John Doe"
          icon={User}
          autoComplete="name"
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
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
          placeholder="At least 8 characters"
          icon={LockKeyhole}
          autoComplete="new-password"
          hint="Min. 8 characters"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <FormField
          label="Confirm Password"
          type="password"
          id="confirmPassword"
          value={form.confirmPassword}
          placeholder="Repeat your password"
          icon={LockKeyhole}
          autoComplete="new-password"
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full btn-gold py-4 text-[1.05rem] rounded-[14px] disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(212,175,55,0.4)] transition-all duration-300 flex items-center justify-center gap-2"
        >
          {loading && <span className="spinner inline-block" />}
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="flex items-center gap-3 my-7">
        <div className="flex-1 h-[1px] bg-white/10" />
        <span className="text-[0.78rem] text-gray-500">Already have an account?</span>
        <div className="flex-1 h-[1px] bg-white/10" />
      </div>

      <p className="text-center text-gray-400 text-[0.95rem]">
        Login{' '}
        <Link
          to="/login"
          className="text-gold underline underline-offset-4 decoration-gold/50 hover:text-gold-light hover:decoration-gold"
        >
          here
        </Link>
      </p>
    </AuthLayout>
  );
}
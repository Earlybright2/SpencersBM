import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LockKeyhole, CheckCircle2, ShieldAlert, AlertCircle } from 'lucide-react';
import AuthLayout from '../components/AuthLayout.jsx';
import FormField from '../components/FormField.jsx';
import api, { getErrorMessage } from '../api.js';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setStatus('error');
      setMessage('Password must be at least 8 characters');
      return;
    }
    setStatus('loading');
    try {
      const res = await api.post('/auth/reset-password', { token, newPassword: password });
      setStatus('success');
      setMessage(res.data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setStatus('error');
      setMessage(getErrorMessage(err));
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Invalid Link">
        <div className="text-center mb-5">
          <div className="w-16 h-16 rounded-full bg-[#e0645a]/15 border border-[#e0645a]/30 flex items-center justify-center text-[#ff8a80] mx-auto mb-4">
            <ShieldAlert size={30} strokeWidth={1.8} />
          </div>
          <p className="text-body/80 text-[0.95rem]">
            This password reset link is missing a token. Please request a new one.
          </p>
        </div>
        <Link to="/forgot-password" className="btn-gold w-full block text-center py-4 text-base">
          Request Reset Link
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a New Password" subtitle="Enter your new password below">
      {status === 'success' ? (
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center text-gold mx-auto mb-5">
            <CheckCircle2 size={34} strokeWidth={1.8} />
          </div>
          <p className="text-center text-[#2ecc71] font-medium mb-6">{message}</p>
          <Link to="/login" className="btn-gold w-full block text-center py-4 text-base">
            Go to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {status === 'error' && (
            <div className="flex items-start gap-3 bg-[#e0645a]/10 border border-[#e0645a]/30 text-[#ff8a80] text-[0.9rem] rounded-[12px] px-4 py-3 mb-6">
              <AlertCircle size={18} strokeWidth={1.9} className="shrink-0 mt-[1px]" />
              <span>{message}</span>
            </div>
          )}
          <FormField
            label="New Password"
            type="password"
            id="newPassword"
            value={password}
            placeholder="At least 8 characters"
            icon={LockKeyhole}
            autoComplete="new-password"
            hint="Min. 8 characters"
            onChange={(e) => setPassword(e.target.value)}
          />
          <FormField
            label="Confirm New Password"
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            placeholder="Repeat your new password"
            icon={LockKeyhole}
            autoComplete="new-password"
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full btn-gold py-4 text-[1.05rem] rounded-[14px] disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(212,175,55,0.4)] transition-all duration-300 flex items-center justify-center gap-2"
          >
            {status === 'loading' && <span className="spinner inline-block" />}
            {status === 'loading' ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
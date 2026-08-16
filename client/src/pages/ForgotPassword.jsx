import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MailCheck, AlertCircle } from 'lucide-react';
import AuthLayout from '../components/AuthLayout.jsx';
import FormField from '../components/FormField.jsx';
import api, { getErrorMessage } from '../api.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | sent | error
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      await api.post('/auth/forgot-password', { email });
      setStatus('sent');
      setMessage('If an account exists for that email, a reset link has been sent.');
    } catch (err) {
      setStatus('error');
      setMessage(getErrorMessage(err));
    }
  };

  return (
    <AuthLayout title="Reset Your Password" subtitle="Enter your email and we'll send you a reset link">
      {status === 'sent' ? (
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center text-gold mx-auto mb-5">
            <MailCheck size={32} strokeWidth={1.8} />
          </div>
          <p className="text-body/80 text-[0.95rem] mb-4">{message}</p>
          <p className="text-subtle text-[0.82rem] mb-7">
            In development mode, the reset link is also printed to the server console.
          </p>
          <Link
            to="/login"
            className="btn-gold w-full block text-center py-4 text-base hover:-translate-y-[2px] hover:shadow-[0_15px_40px_rgba(212,175,55,0.4)]"
          >
            Back to Login
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
            label="Email Address"
            type="email"
            id="email"
            value={email}
            placeholder="you@example.com"
            icon={Mail}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full btn-gold py-4 text-[1.05rem] rounded-[14px] disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(212,175,55,0.4)] transition-all duration-300 flex items-center justify-center gap-2"
          >
            {status === 'loading' && <span className="spinner inline-block" />}
            {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      )}

      <div className="flex items-center gap-3 my-7">
        <div className="flex-1 h-[1px] bg-softline" />
        <span className="text-[0.72rem] uppercase tracking-[0.15em] text-subtle">Remembered your password?</span>
        <div className="flex-1 h-[1px] bg-softline" />
      </div>

      <Link
        to="/login"
        className="w-full btn-ghost py-4 text-[1.02rem] rounded-[14px] flex items-center justify-center hover:-translate-y-1 transition-all duration-300"
      >
        Back to Login
      </Link>
    </AuthLayout>
  );
}
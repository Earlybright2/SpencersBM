import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LockKeyhole, Save, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import FormField from '../components/FormField.jsx';
import { getErrorMessage } from '../api.js';

export default function ChangePassword() {
  const { user, changePassword } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    if (form.newPassword !== form.confirmPassword) {
      setStatus('error');
      setMessage('New passwords do not match');
      return;
    }
    if (form.newPassword.length < 8) {
      setStatus('error');
      setMessage('New password must be at least 8 characters');
      return;
    }
    try {
      const res = await changePassword(form.currentPassword, form.newPassword);
      setStatus('success');
      setMessage(res.message);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setStatus('error');
      setMessage(getErrorMessage(err));
    }
  };

  return (
    <AuthLayout title="Change Password" subtitle={`Logged in as ${user?.email || 'you'}. Update your password anytime.`}>
      {status === 'success' && (
        <div className="flex items-start gap-3 bg-[#2ecc71]/10 border border-[#2ecc71]/30 text-[#5eead4] text-[0.9rem] rounded-[12px] px-4 py-3 mb-6">
          <CheckCircle2 size={18} strokeWidth={1.9} className="shrink-0 mt-[1px]" />
          <span>{message}</span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-start gap-3 bg-[#e0645a]/10 border border-[#e0645a]/30 text-[#ff8a80] text-[0.9rem] rounded-[12px] px-4 py-3 mb-6">
          <AlertCircle size={18} strokeWidth={1.9} className="shrink-0 mt-[1px]" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <FormField
          label="Current Password"
          type="password"
          id="currentPassword"
          value={form.currentPassword}
          placeholder="Your current password"
          icon={LockKeyhole}
          autoComplete="current-password"
          onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
        />
        <FormField
          label="New Password"
          type="password"
          id="newPassword"
          value={form.newPassword}
          placeholder="At least 8 characters"
          icon={LockKeyhole}
          autoComplete="new-password"
          hint="Min. 8 characters"
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
        />
        <FormField
          label="Confirm New Password"
          type="password"
          id="confirmPassword"
          value={form.confirmPassword}
          placeholder="Repeat your new password"
          icon={LockKeyhole}
          autoComplete="new-password"
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full btn-gold py-4 text-base disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none hover:-translate-y-[2px] hover:shadow-[0_15px_40px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2"
        >
          {status === 'loading' && <span className="spinner inline-block" />}
          <Save size={18} strokeWidth={1.9} />
          {status === 'loading' ? 'Updating...' : 'Update Password'}
        </button>
      </form>

      <p className="text-gray-400 text-[0.95rem] text-center mt-6">
        Forgot your password?{' '}
        <Link to="/forgot-password" className="text-gold hover:text-gold-light">
          Reset it here
        </Link>
      </p>
      <Link to="/" className="flex items-center justify-center gap-1 text-[#707070] text-[0.8rem] mt-3 hover:text-gold transition-colors">
        <ArrowRight size={14} strokeWidth={1.8} />
        Return to the marketplace
      </Link>
    </AuthLayout>
  );
}
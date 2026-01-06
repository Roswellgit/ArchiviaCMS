'use client';

import { useState, Suspense } from 'react'; 
import { useSearchParams, useRouter } from 'next/navigation';
import { resetPassword } from '../../services/apiService';
import PasswordChecklist from '../../components/PasswordChecklist';
import { toast } from 'react-hot-toast';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [passwordValidity, setPasswordValidity] = useState({
    hasLength: false, hasUpper: false, hasLower: false, hasNumber: false, hasSpecial: false,
  });

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordValidity({
      hasLength: newPassword.length >= 8,
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecial: /[@$!%*?&]/.test(newPassword),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return toast.error("Passwords do not match.");
    if (!Object.values(passwordValidity).every(Boolean)) return toast.error("Password is too weak.");

    setLoading(true);
    try {
      await resetPassword(token, password);
      toast.success('Password updated!');
      setTimeout(() => router.push('/login'), 5000);
    } catch (error) { toast.error('Reset failed.'); } 
    finally { setLoading(false); }
  };

  if (!token) return <p className="text-center text-red-500">Invalid link.</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-left">
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">New Password</label>
        <input type="password" value={password} onChange={handlePasswordChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
        <div className="mt-2"><PasswordChecklist validity={passwordValidity} /></div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Confirm Password</label>
        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
      </div>
      <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition disabled:bg-indigo-300">
        {loading ? 'Updating...' : 'Set Password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="container mx-auto p-4 pt-20 max-w-md">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-6">Create New Password</h1>
        <Suspense fallback={<div>Loading...</div>}><ResetPasswordForm /></Suspense>
      </div>
    </div>
  );
}
'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { changeUserPassword } from '../services/apiService';
import EditUserModal from './EditUserModal'; // Ensure EditUserModal.js is in the same folder

export default function UserProfile() {
  const { user, isAuthenticated, authLoading } = useAuth();
  const router = useRouter();

  // 'isEditing' now controls the Modal visibility, not inline inputs
  const [isEditing, setIsEditing] = useState(false); 

  // Separate state for the "Change Password" modal (if you want to keep it separate)
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwMessage, setPwMessage] = useState({ type: '', text: '' });
  const [isPwSaving, setIsPwSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Refreshes the page/data after a successful update in the modal
  const handleUpdateSuccess = () => {
    window.location.reload(); 
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setIsPwSaving(true);
    setPwMessage({ type: '', text: '' });
    try {
      await changeUserPassword(pwForm.currentPassword, pwForm.newPassword);
      setPwMessage({ type: 'success', text: 'Password changed successfully!' });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setShowPwModal(false), 5000);
    } catch (err) {
      setPwMessage({ type: 'error', text: err.response?.data?.message || 'Failed to change password.' });
    } finally {
      setIsPwSaving(false);
    }
  };

  if (authLoading || !isAuthenticated) return <div className="text-center p-10 text-slate-400">Loading profile...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile Header Card */}
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 flex flex-col md:flex-row items-center md:items-start gap-6">
        <div className="w-24 h-24 rounded-full bg-slate-900 text-white flex items-center justify-center text-3xl font-bold uppercase shadow-lg shadow-slate-200">
            {user.firstName ? user.firstName.charAt(0) : 'U'}
        </div>
        <div className="flex-grow text-center md:text-left">
            <h2 className="text-3xl font-extrabold text-slate-900">{user.firstName} {user.lastName}</h2>
            <p className="text-slate-500 font-medium">{user.email}</p>
            <div className="mt-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${user.is_admin ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                    {user.is_admin ? 'Administrator' : 'Standard User'}
                </span>
            </div>
        </div>
        
        {/* CLICKING THIS NOW OPENS THE MODAL */}
        <button onClick={() => setIsEditing(true)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition shadow-sm">
          Edit Details
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Personal Info (Static View) */}
        <div className="md:col-span-2 bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-2">Personal Details</h3>
            
            <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">First Name</label>
                        <p className="text-slate-800 font-semibold text-lg">{user.firstName}</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Last Name</label>
                        <p className="text-slate-800 font-semibold text-lg">{user.lastName}</p>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                    <p className="text-slate-800 font-semibold text-lg">{user.email}</p>
                </div>
            </div>
        </div>

        {/* Right Column: Security */}
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 h-fit">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Security</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">Ensure your account uses a strong password to protect your data.</p>
            <button onClick={() => setShowPwModal(true)} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 hover:bg-red-100 transition-colors">
                Change Password
            </button>
        </div>
      </div>

      {/* --- RENDER THE NEW OTP MODAL HERE --- */}
      {isEditing && (
        <EditUserModal 
            user={user} 
            onClose={() => setIsEditing(false)} 
            onUpdateSuccess={handleUpdateSuccess} 
        />
      )}

      {/* Keep your existing Change Password Modal */}
      {showPwModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Update Password</h3>
            {pwMessage.text && (
              <div className={`mb-4 p-3 text-sm rounded-lg font-medium ${pwMessage.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {pwMessage.text}
              </div>
            )}
            <form onSubmit={handlePwSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Current Password</label>
                <input type="password" name="currentPassword" value={pwForm.currentPassword} onChange={(e) => setPwForm({...pwForm, [e.target.name]: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">New Password</label>
                <input type="password" name="newPassword" value={pwForm.newPassword} onChange={(e) => setPwForm({...pwForm, [e.target.name]: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <input type="password" name="confirmPassword" value={pwForm.confirmPassword} onChange={(e) => setPwForm({...pwForm, [e.target.name]: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowPwModal(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:text-slate-800 transition">Cancel</button>
                <button type="submit" disabled={isPwSaving} className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 transition disabled:bg-slate-400">
                  {isPwSaving ? 'Updating...' : 'Confirm Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
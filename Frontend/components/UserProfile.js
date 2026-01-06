'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { requestPasswordOTP, changeUserPassword } from '../services/apiService';
import EditUserModal from '../components/EditUserModal'; 

export default function UserProfile() {
  const { user, isAuthenticated, authLoading } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false); 

  const [showPwModal, setShowPwModal] = useState(false);
  
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwMessage, setPwMessage] = useState({ type: '', text: '' });
  const [isPwSaving, setIsPwSaving] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleUpdateSuccess = () => {
    window.location.reload(); 
  };

  const handleCloseModal = () => {
    setShowPwModal(false);
    setStep(1);
    setOtp('');
    setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPwMessage({ type: '', text: '' });
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    setPwMessage({ type: '', text: '' });

    if (step === 1) {
        if (pwForm.newPassword !== pwForm.confirmPassword) {
            setPwMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        
        setIsPwSaving(true);
        try {

            await requestPasswordOTP(pwForm.currentPassword);

            setStep(2);
            setPwMessage({ type: 'success', text: 'OTP sent to your email. Please verify.' });
        } catch (err) {
            setPwMessage({ type: 'error', text: err.response?.data?.message || 'Failed to request OTP.' });
        } finally {
            setIsPwSaving(false);
        }
    } 
    
    else if (step === 2) {
        if (!otp || otp.length < 6) {
            setPwMessage({ type: 'error', text: 'Please enter a valid OTP.' });
            return;
        }

        setIsPwSaving(true);
        try {
            await changeUserPassword(otp, pwForm.newPassword);
            
            setPwMessage({ type: 'success', text: 'Password changed successfully!' });
            setTimeout(() => {
                handleCloseModal();
            }, 2000);
        } catch (err) {
            setPwMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update password.' });
        } finally {
            setIsPwSaving(false);
        }
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
        
        <button onClick={() => setIsEditing(true)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition shadow-sm">
          Edit Details
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Personal Info */}
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

      {/* Edit User Modal */}
      {isEditing && (
        <EditUserModal 
            user={user} 
            onClose={() => setIsEditing(false)} 
            onUpdateSuccess={handleUpdateSuccess} 
        />
      )}

      {showPwModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            <h3 className="text-xl font-bold text-slate-900 mb-6">
                {step === 1 ? 'Update Password' : 'Verify Identity'}
            </h3>
            
            {pwMessage.text && (
              <div className={`mb-4 p-3 text-sm rounded-lg font-medium ${pwMessage.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {pwMessage.text}
              </div>
            )}
            
            <form onSubmit={handlePwSubmit} className="space-y-4">
              
              {/* --- STEP 1: PASSWORD FIELDS --- */}
              {step === 1 && (
                <>
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Current Password</label>
                    <div className="relative">
                      <input 
                        type={showCurrent ? "text" : "password"} 
                        name="currentPassword" 
                        value={pwForm.currentPassword} 
                        onChange={(e) => setPwForm({...pwForm, [e.target.name]: e.target.value})} 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10" 
                        required 
                      />
                      <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700 focus:outline-none">
                        {showCurrent ? <EyeOpenIcon /> : <EyeClosedIcon />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">New Password</label>
                    <div className="relative">
                      <input 
                        type={showNew ? "text" : "password"} 
                        name="newPassword" 
                        value={pwForm.newPassword} 
                        onChange={(e) => setPwForm({...pwForm, [e.target.name]: e.target.value})} 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10" 
                        required 
                      />
                      <button type="button" onClick={() => setShowNew(!showNew)} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700 focus:outline-none">
                        {showNew ? <EyeOpenIcon /> : <EyeClosedIcon />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm New Password</label>
                    <div className="relative">
                      <input 
                        type={showConfirm ? "text" : "password"} 
                        name="confirmPassword" 
                        value={pwForm.confirmPassword} 
                        onChange={(e) => setPwForm({...pwForm, [e.target.name]: e.target.value})} 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10" 
                        required 
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700 focus:outline-none">
                        {showConfirm ? <EyeOpenIcon /> : <EyeClosedIcon />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* --- STEP 2: OTP FIELD --- */}
              {step === 2 && (
                <div className="text-center animate-fade-in py-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-3">Enter the 6-digit OTP sent to your email</label>
                    <input 
                        type="text" 
                        value={otp} 
                        onChange={(e) => setOtp(e.target.value)} 
                        className="w-3/4 p-4 text-center text-2xl tracking-[0.5em] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase" 
                        placeholder="000000"
                        maxLength={6}
                        required 
                        autoFocus
                    />
                    <div className="mt-4 text-sm">
                        <button type="button" onClick={() => setStep(1)} className="text-indigo-600 hover:underline font-medium">
                            &larr; Back to Passwords
                        </button>
                    </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 text-slate-600 font-bold hover:text-slate-800 transition">Cancel</button>
                <button type="submit" disabled={isPwSaving} className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 transition disabled:bg-slate-400">
                  {isPwSaving ? 'Processing...' : (step === 1 ? 'Send OTP' : 'Verify & Update')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function EyeOpenIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
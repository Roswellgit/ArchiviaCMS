'use client';

import { useState, useEffect } from 'react';

export default function EditUserModal({ user, onClose, onUpdateSuccess }) {
  const [formData, setFormData] = useState({ 
    first_name: '', 
    last_name: '', 
    email: '', 
    password: '', // Added password field just in case
    is_admin: false 
  });
  
  const [step, setStep] = useState('EDIT'); // 'EDIT' or 'OTP'
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(''); // To show "OTP Sent" or error messages

  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      setFormData({ 
        first_name: user.first_name || '', 
        last_name: user.last_name || '', 
        email: user.email || '', 
        is_admin: user.is_admin || false 
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // STEP 1: Send Data & Request OTP
  const handleInitiateUpdate = async (e) => {
    e.preventDefault(); 
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      // Using the specific endpoint for profile updates (self-service)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/update-profile/initiate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: formData.first_name, // Map to backend expectation
          lastName: formData.last_name,
          email: formData.email,
          password: formData.password // Optional
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to initiate update');

      if (data.requireOtp) {
        setStep('OTP');
        setMessage(data.message);
      } else {
        // Fallback if OTP is disabled on backend for some reason
        if (onUpdateSuccess) onUpdateSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err);
      setMessage(err.message);
    } finally { 
      setLoading(false); 
    }
  };

  // STEP 2: Verify OTP & Finalize
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/update-profile/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ otp }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Verification failed');

      // Update local storage token if a new one was returned (often done when email changes)
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      alert('Profile updated successfully!');
      if (onUpdateSuccess) onUpdateSuccess(); // Refresh parent data
      onClose();

    } catch (err) {
      console.error(err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg">
        
        {/* Header */}
        <h2 className="text-xl font-bold mb-2 text-slate-900">
          {step === 'EDIT' ? 'Edit User Profile' : 'Verify Update'}
        </h2>
        
        {/* Error/Info Message Banner */}
        {message && (
          <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${step === 'OTP' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}

        {step === 'EDIT' ? (
          // --- STEP 1: EDIT FORM ---
          <form onSubmit={handleInitiateUpdate} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">First Name</label>
                <input name="first_name" value={formData.first_name} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Last Name</label>
                <input name="last_name" value={formData.last_name} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email</label>
              <input name="email" value={formData.email} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
            </div>

            {/* Added Password Field (Optional change) */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">New Password (Optional)</label>
              <input type="password" name="password" placeholder="Leave blank to keep current" value={formData.password || ''} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {/* Note: Ideally, users shouldn't be able to edit their own Admin status. 
                The backend implementation I provided ignores this field for security. */}
            {/* <div className="flex items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
              <input type="checkbox" id="is_admin" name="is_admin" checked={formData.is_admin} onChange={handleChange} className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
              <label htmlFor="is_admin" className="ml-3 block text-sm font-semibold text-slate-700">Grant Administrator Privileges</label>
            </div> */}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={loading} className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md disabled:bg-indigo-300">
                {loading ? 'Processing...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          // --- STEP 2: OTP FORM ---
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <p className="text-slate-600 text-sm">
              For security, we sent a verification code to your current email address. Please enter it below.
            </p>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">One-Time Password</label>
              <input 
                type="text" 
                name="otp" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
                maxLength={6}
                placeholder="123456"
                className="w-full p-3 text-center text-xl tracking-[0.5em] font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                required 
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setStep('EDIT')} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50">Back</button>
              <button type="submit" disabled={loading} className="px-5 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-md disabled:bg-green-300">
                {loading ? 'Verifying...' : 'Verify Update'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast'; // ✅ Import Toast

export default function EditUserModal({ user, onClose, onUpdateSuccess }) {
  const [formData, setFormData] = useState({ 
    first_name: '', 
    last_name: '', 
    email: '', 
    password: '', 
    is_admin: false 
  });
  
  const [step, setStep] = useState('EDIT'); 
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(''); 

  // Use the safe API URL fallback for local development
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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
      
      const res = await fetch(`${API_URL}/auth/update-profile/initiate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: formData.first_name, 
          lastName: formData.last_name,
          email: formData.email,
          password: formData.password 
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to initiate update');

      if (data.requireOtp) {
        setStep('OTP');
        setMessage(data.message);
        toast.success("OTP sent to your email!"); // ✅ Optional: Toast for OTP sent
      } else {
        // Success without OTP (e.g. just name change, if backend allows)
        toast.success('Profile updated successfully!'); // ✅ Toast here
        if (onUpdateSuccess) onUpdateSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err);
      setMessage(err.message);
      // Optional: You could also toast the error
      // toast.error(err.message); 
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
      const res = await fetch(`${API_URL}/auth/update-profile/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ otp }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Verification failed');

      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      // ✅ SUCCESS: Toast instead of Alert
      toast.success('Profile updated successfully!');
      
      if (onUpdateSuccess) onUpdateSuccess(); 
      onClose();

    } catch (err) {
      console.error(err);
      setMessage(err.message);
      toast.error(err.message); // ✅ Optional: Toast on error too
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg">
        
        <h2 className="text-xl font-bold mb-2 text-slate-900">
          {step === 'EDIT' ? 'Edit User Profile' : 'Verify Update'}
        </h2>
        
        {/* Inline Message Banner */}
        {message && (
          <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${step === 'OTP' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}

        {step === 'EDIT' ? (
          <form onSubmit={handleInitiateUpdate} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">First Name</label>
                <input name="first_name" 
                value={formData.first_name} 
                onChange={handleChange} 
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Last Name</label>
                <input name="last_name" 
                value={formData.last_name} 
                onChange={handleChange} 
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                Email
              </label>
              <input
                name="email"
                value={formData.email}
                readOnly
                className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={loading} className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md disabled:bg-indigo-300">
                {loading ? 'Processing...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
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
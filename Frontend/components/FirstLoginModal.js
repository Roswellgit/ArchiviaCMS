'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import api from '../services/apiService'; 

export default function FirstLoginModal() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();

  // Watch for user changes to trigger the modal
  useEffect(() => {
    if (user && user.force_password_change) {
        setIsOpen(true);
    } else {
        setIsOpen(false);
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
        return toast.error("New passwords do not match");
    }

    // Basic regex for security
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(formData.newPassword)) {
        return toast.error("Password must be 8+ chars with Uppercase, Lowercase, Number, and Special Char.");
    }

    setLoading(true);
    try {
        // We use the existing changePassword endpoint (Ensure this endpoint exists in backend/authController)
        // If your backend uses OTP for changePassword, create a new simple endpoint like 'updatePassword' 
        // that accepts { currentPassword, newPassword } for logged-in users.
        await api.put('/auth/change-password-direct', { 
             currentPassword: formData.currentPassword, 
             newPassword: formData.newPassword
        });
        
        toast.success("Password updated successfully!");
        
        // Reload to refresh the 'user' object from the backend (which should now have force_password_change: false)
        window.location.reload(); 
        
    } catch (err) {
        console.error(err);
        toast.error(err.response?.data?.message || "Failed to update password");
    } finally {
        setLoading(false);
    }
  };

  const handleLogout = () => {
      logout();
      setIsOpen(false);
      router.push('/login');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4 animate-fade-in">
       <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 relative">
          <div className="text-center mb-6">
             <div className="mx-auto w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
             </div>
             <h2 className="text-2xl font-bold text-slate-900">Security Update Required</h2>
             <p className="text-slate-500 text-sm mt-2">
                This is your first login. Please change your temporary password to continue.
             </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
             <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Temporary Password</label>
                <input 
                    type="password" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    placeholder="Enter the password you used to login"
                    value={formData.currentPassword}
                    onChange={e => setFormData({...formData, currentPassword: e.target.value})}
                    required
                />
             </div>

             <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">New Password</label>
                <input 
                    type="password" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    value={formData.newPassword}
                    onChange={e => setFormData({...formData, newPassword: e.target.value})}
                    required
                />
             </div>

             <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Confirm New Password</label>
                <input 
                    type="password" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    value={formData.confirmPassword}
                    onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                    required
                />
             </div>

             <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-50 mt-2"
             >
                {loading ? 'Updating...' : 'Update Password & Enter'}
             </button>
          </form>

          <div className="mt-6 text-center border-t border-slate-100 pt-4">
              <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-slate-600 transition">
                  Cancel and Log Out
              </button>
          </div>
       </div>
    </div>
  );
}
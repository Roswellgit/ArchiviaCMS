'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import api from '../services/apiService';
const RequirementItem = ({ met, text }) => (
  <li className={`flex items-center gap-2 text-xs ${met ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
    <span className={`flex items-center justify-center w-4 h-4 rounded-full text-[10px] ${met ? 'bg-emerald-100' : 'bg-slate-100'}`}>
      {met ? '✓' : '•'}
    </span>
    {text}
  </li>
);

export default function FirstLoginModal() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValidity, setPasswordValidity] = useState({
    hasLength: false, hasUpper: false, hasLower: false, hasNumber: false, hasSpecial: false,
  });

  const router = useRouter();

  useEffect(() => {
    if (user && user.force_password_change) {
        setIsOpen(true);
    } else {
        setIsOpen(false);
    }
  }, [user]);
  useEffect(() => {
    const pwd = formData.newPassword || '';
    setPasswordValidity({
        hasLength: pwd.length >= 8,
        hasUpper: /[A-Z]/.test(pwd),
        hasLower: /[a-z]/.test(pwd),
        hasNumber: /[0-9]/.test(pwd),
        hasSpecial: /[^A-Za-z0-9]/.test(pwd),
    });
  }, [formData.newPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
        return toast.error("New passwords do not match");
    }

    const allValid = Object.values(passwordValidity).every(Boolean);
    if (!allValid) {
        return toast.error("Password does not meet complexity requirements.");
    }

    setLoading(true);
    try {
        await api.put('/auth/change-password-direct', { 
             currentPassword: formData.currentPassword, 
             newPassword: formData.newPassword
        });
        
        toast.success("Password updated successfully!");
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

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4 animate-fade-in">
       <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 relative max-h-[90vh] overflow-y-auto">
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
                <div className="relative">
                    <input 
                        name="currentPassword"
                        type={showPassword ? "text" : "password"} 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition pr-10"
                        placeholder="Enter the password you used to login"
                        value={formData.currentPassword}
                        onChange={handleChange}
                        required
                    />
                    <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                    </button>
                </div>
             </div>

             <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">New Password</label>
                <div className="relative">
                    <input 
                        name="newPassword"
                        type={showPassword ? "text" : "password"} 
                        className={`w-full p-3 bg-slate-50 border rounded-lg focus:ring-2 outline-none transition pr-10 ${formData.newPassword && !Object.values(passwordValidity).every(Boolean) ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-500'}`}
                        value={formData.newPassword}
                        onChange={handleChange}
                        required
                    />
                </div>
                
                {/* Requirements Checklist */}
                <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Password Requirements:</p>
                    <ul className="grid grid-cols-2 gap-1">
                        <RequirementItem met={passwordValidity.hasLength} text="8+ Characters" />
                        <RequirementItem met={passwordValidity.hasUpper} text="Uppercase Letter" />
                        <RequirementItem met={passwordValidity.hasLower} text="Lowercase Letter" />
                        <RequirementItem met={passwordValidity.hasNumber} text="Number (0-9)" />
                        <RequirementItem met={passwordValidity.hasSpecial} text="Special Character" />
                    </ul>
                </div>
             </div>

             <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Confirm New Password</label>
                <input 
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"} 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                />
             </div>

             <button 
                type="submit" 
                disabled={loading || !Object.values(passwordValidity).every(Boolean)}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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
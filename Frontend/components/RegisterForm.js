'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PasswordChecklist from './PasswordChecklist.js'; 
import { register as apiRegister } from '../services/apiService'; 
import { toast } from 'react-hot-toast'; 
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { jwtDecode } from 'jwt-decode';

export default function RegisterForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // State to hold the Google token temporarily
  const [googleToken, setGoogleToken] = useState(null);

  const router = useRouter(); 
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  
  const [passwordValidity, setPasswordValidity] = useState({
    hasLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false,
  });

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordValidity({
      hasLength: newPassword.length >= 8,
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecial: /[@$!%*?&_]/.test(newPassword),
    });
  };

  // 1. Intercept Google Success: Decode token and fill form instead of immediate login
  const handleGoogleSuccess = (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      setFirstName(decoded.given_name || '');
      setLastName(decoded.family_name || '');
      setEmail(decoded.email || '');
      setGoogleToken(credentialResponse.credential);
      
      toast.success('Google details received. Please create a password to finish signup.', {
        duration: 5000,
        icon: '🔒'
      });
    } catch (err) {
      console.error('Google Decode Error:', err);
      toast.error('Failed to retrieve Google details.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      toast.error('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    const allValid = Object.values(passwordValidity).every(Boolean);
    if (!allValid) {
        toast.error('Please ensure your password meets all the requirements.');
        return;
    }

    setLoading(true);

    // 2. Branch logic: Check if completing a Google Signup or doing a Standard Signup
    if (googleToken) {
      try {
        // Call the Google Auth endpoint with BOTH the token and the new password
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/google`, {
          token: googleToken,
          password: password, 
        });
        
        login(res.data.user, res.data.token);
        toast.success(`Account created! Welcome, ${res.data.user.firstName}.`);
        setTimeout(() => { router.push('/'); }, 1000);
      } catch (error) {
        console.error('Google Signup Error:', error);
        const msg = error.response?.data?.message || 'Google registration failed.';
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    } else {
      // Standard Email/Password Registration
      const registerPromise = apiRegister(firstName, lastName, email, password);

      toast.promise(registerPromise, {
          loading: 'Registering...',
          success: (response) => {
            setTimeout(() => { router.push(`/verify?email=${encodeURIComponent(email)}`); }, 1500); 
            return `Success! OTP sent to ${email}`; 
          },
          error: (error) => {
            if (error.response?.data?.message) return `Registration failed: ${error.response.data.message}`;
            return 'Registration failed.';
          }
        }
      ).finally(() => { setLoading(false); });
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900">Create Account</h2>
        <p className="text-slate-500 text-sm mt-2">Join Archivia to access premium features</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex gap-4 flex-col sm:flex-row">
            <div className="w-full sm:w-1/2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">First Name</label>
                <input 
                  type="text" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)} 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                  required 
                  disabled={!!googleToken} // Disable if filled by Google
                />
            </div>
            <div className="w-full sm:w-1/2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Last Name</label>
                <input 
                  type="text" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)} 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                  required 
                  disabled={!!googleToken} // Disable if filled by Google
                />
            </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className={`w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${googleToken ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-slate-50'}`}
            required 
            readOnly={!!googleToken} // Prevent editing email to ensure it matches the token
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={handlePasswordChange}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all pr-12"
              required
              placeholder={googleToken ? "Create a password for your account" : ""}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-sm text-slate-500 font-medium hover:text-indigo-600 transition-colors">
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {password && <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100"><PasswordChecklist validity={passwordValidity} /></div>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              required
            />
          </div>
          {confirmPassword && (
            <p className={`mt-2 text-xs font-bold flex items-center gap-1 ${password === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
              {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
            </p>
          )}
        </div>

        <button type="submit" disabled={loading} className="w-full py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 disabled:bg-indigo-300 disabled:cursor-not-allowed mt-4">
          {loading ? 'Creating Account...' : (googleToken ? 'Complete Google Signup' : 'Register')}
        </button>
        
        {/* Helper to cancel Google flow if they changed their mind */}
        {googleToken && (
          <button 
            type="button" 
            onClick={() => {
              setGoogleToken(null);
              setFirstName('');
              setLastName('');
              setEmail('');
              setPassword('');
              setConfirmPassword('');
            }}
            className="w-full py-2 text-sm text-slate-500 hover:text-red-600 transition-colors"
          >
            Cancel Google Signup
          </button>
        )}
      </form>

      {!googleToken && (
        <>
          <div className="my-6 flex items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="mx-4 text-slate-400 text-xs font-bold uppercase tracking-wide">Or</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <div className="flex justify-center">
            <GoogleLogin 
              onSuccess={handleGoogleSuccess} 
              onError={() => toast.error('Google Signup Failed')} 
              theme="outline" 
              size="large" 
              text="signup_with" 
              width="100%" 
              shape="pill" 
            />
          </div>
        </>
      )}

      <p className="mt-8 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="text-indigo-600 hover:text-indigo-800 font-bold transition-colors">
          Log in
        </Link>
      </p>
    </div>
  );
}
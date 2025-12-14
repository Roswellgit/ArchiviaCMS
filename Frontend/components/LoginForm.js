'use client';
import { GoogleLogin } from '@react-oauth/google'; 
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
// Updated import to include googleLogin
import { login as apiLogin, googleLogin as apiGoogleLogin } from '../services/apiService';
import { toast } from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); 
  const [loading, setLoading] = useState(false);
  
  // NEW: State for Google Login Modal
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);
  const [googleToken, setGoogleToken] = useState(null); // Store the raw token

  const router = useRouter();
  const { login } = useAuth();
  
  const handleRedirect = (user) => {
    if (user.is_admin) {
      router.push('/admin');
    } else {
      router.push('/');
    }
  };

  // Shared Login Logic (Standard Email/Pass)
  const performLogin = async (loginEmail, loginPassword) => {
    setLoading(true);
    const toastId = toast.loading('Logging in...');
    try {
      const response = await apiLogin({ email: loginEmail, password: loginPassword });
      const userData = response.data.user;
      login(userData, response.data.token);
      toast.success(`Success! Welcome, ${userData.firstName}.`, { id: toastId });
      setTimeout(() => {
        handleRedirect(userData);
      }, 1000);
    } catch (error) {
      const errorMessage = error.response?.status === 401
        ? 'Login failed: Invalid password.'
        : 'Login failed. User may not exist or error occurred.';
      toast.error(errorMessage, { id: toastId });
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Google Login Logic (Token + Password)
  const performGoogleLogin = async (token, loginPassword) => {
    setLoading(true);
    const toastId = toast.loading('Verifying Google credentials...');
    try {
        // Send both Token AND Password to backend
        const response = await apiGoogleLogin(token, loginPassword);
        
        const userData = response.data.user;
        login(userData, response.data.token);
        
        toast.success(`Welcome back, ${userData.firstName}!`, { id: toastId });
        setTimeout(() => {
            handleRedirect(userData);
        }, 1000);
    } catch (error) {
        console.error('Google Login error:', error);
        let msg = 'Google login failed.';
        
        if (error.response) {
            // Backend returns 403 if existing user has placeholder password
            if (error.response.status === 403) {
                 msg = error.response.data.message || 'Security Update: Please reset your password to log in.';
            } else if (error.response.status === 401) {
                 msg = 'Invalid password for this Google account.';
            } else {
                 msg = error.response.data.message || msg;
            }
        }
        toast.error(msg, { id: toastId });
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both email and password.'); 
      return;
    }
    performLogin(email, password);
  };

  // UPDATED: Google Handler extracts details and opens password modal
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      
      // Update state with Google details
      setGoogleUser({
        firstName: decoded.given_name,
        lastName: decoded.family_name,
        name: decoded.name, 
        email: decoded.email,
        picture: decoded.picture
      });
      
      // Store the token to send later
      setGoogleToken(credentialResponse.credential);

      // Pre-fill main form email (optional, keeps state consistent)
      setEmail(decoded.email); 
      setPassword(''); // Clear any previous password
      setShowGoogleModal(true); // Open the password modal

    } catch (err) {
      console.error('Google Processing Error:', err);
      toast.error('Failed to process Google login.');
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 w-full max-w-md mx-auto relative overflow-hidden">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900">Welcome Back</h2>
        <p className="text-slate-500 text-sm mt-2">Sign in to access the repository</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            required
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all pr-12" 
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
            Forgot password?
          </Link>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-600 hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 disabled:bg-slate-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>

      <div className="my-6 flex items-center">
        <div className="flex-grow border-t border-slate-200"></div>
        <span className="mx-4 text-slate-400 text-xs font-bold uppercase tracking-wide">Or continue with</span>
        <div className="flex-grow border-t border-slate-200"></div>
      </div>

      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => toast.error('Google Login Failed')}
          theme="outline"
          size="large"
          width="100%"
          shape="pill"
        />
      </div>
      
      <p className="mt-8 text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-indigo-600 hover:text-indigo-800 font-bold transition-colors">
          Create one now
        </Link>
      </p>

      {/* === GOOGLE LOGIN PASSWORD MODAL === */}
      {showGoogleModal && googleUser && (
        <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col justify-center items-center p-6 animate-in fade-in zoom-in duration-200">
            <div className="w-full space-y-6">
                <div className="text-center">
                    {googleUser.picture && (
                        <img src={googleUser.picture} alt="Profile" className="w-16 h-16 rounded-full mx-auto border-2 border-slate-100 shadow-sm mb-3" />
                    )}
                    <h3 className="text-xl font-bold text-slate-900">
                      Hello, {googleUser.firstName} {googleUser.lastName}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">{googleUser.email}</p>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg text-center">
                    <p className="text-xs text-indigo-700 font-semibold">
                        To continue safely, please enter your Archivia password.
                    </p>
                </div>

                <form 
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        // Use the NEW google login function
                        performGoogleLogin(googleToken, password);
                    }}
                >
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-center"
                            autoFocus
                            required
                        />
                         <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                            onClick={() => setShowPassword(!showPassword)}
                            >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            )}
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            type="button" 
                            onClick={() => { setShowGoogleModal(false); setPassword(''); }}
                            className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-colors"
                        >
                            {loading ? 'Verifying...' : 'Continue Login'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
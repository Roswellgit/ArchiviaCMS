'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyEmail } from '../../services/apiService';
import { toast } from 'react-hot-toast';

function VerifyContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const emailFromQuery = searchParams.get('email');

    const [otp, setOtp] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => { if (emailFromQuery) setEmail(emailFromQuery); }, [emailFromQuery]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !otp) return toast.error("Please fill all fields.");
        setLoading(true);
        try {
            await verifyEmail(email, otp);
            toast.success("Verified!");
            setTimeout(() => router.push('/login'), 5000);
        } catch (error) { toast.error("Verification failed."); } 
        finally { setLoading(false); }
    };

    return (
        <div className="p-8 bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md mx-auto mt-10">
            <h2 className="text-2xl font-extrabold text-center text-slate-900 mb-2">Verify Email</h2>
            <p className="text-sm text-slate-500 text-center mb-8">Enter the 6-digit code sent to your inbox.</p>
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">One-Time Password</label>
                    <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-center tracking-[0.5em] font-mono text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="000000" maxLength={6} required />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition disabled:bg-indigo-300">
                    {loading ? 'Verifying...' : 'Complete Registration'}
                </button>
            </form>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <main className="container mx-auto p-4 md:p-8">
            <Suspense fallback={<p className="text-center">Loading...</p>}><VerifyContent /></Suspense>
        </main>
    );
}
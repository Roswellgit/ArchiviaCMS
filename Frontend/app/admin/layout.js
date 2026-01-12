'use client';

import { useAuth } from '../../context/AuthContext'; 
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }) {
  const { user, isAuthenticated, authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Wait for Auth to load
    if (authLoading) return;

    // 2. Not logged in? -> Go to Login
    if (!isAuthenticated) {
      router.push('/login'); 
      return;
    }

    // 3. STRICT BOOLEAN CHECK
    // We strictly rely on the flags provided by the backend token.
    // This covers Admin, Super Admin, and Advisor.
    const hasAccess = user?.is_admin || user?.is_super_admin || user?.is_adviser;

    // 4. Redirect if no access
    if (!hasAccess) {
      // If they are a Student (or any role without these flags), kick them out
      router.push('/analytics'); 
    }

  }, [isAuthenticated, user, authLoading, router, pathname]);

  
  if (authLoading || !isAuthenticated) {
    return (
      <main className="container mx-auto p-20 text-center text-slate-400">
        <div className="animate-pulse">Verifying permissions...</div>
      </main>
    );
  }

  // 5. Render Content (Double-check permissions to prevent content flash)
  const hasAccess = user?.is_admin || user?.is_super_admin || user?.is_adviser;

  if (!hasAccess) return null;

  return (
    <main 
      className="container mx-auto p-6 md:p-10 min-h-screen"
      style={{ backgroundColor: 'var(--background-color)' }}
    >
        <div className="max-w-7xl mx-auto">
            {children}
        </div>
    </main>
  );
}
'use client';

import { useAuth } from '../../context/AuthContext'; 
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }) {
  const { user, isAuthenticated, authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Define access logic in one place
  // Note: This allows Advisors into /admin. 
  // Ensure individual pages (like /admin/theme) have their own checks if Advisors shouldn't see them.
  const hasAccess = user?.is_admin || user?.is_super_admin || user?.is_adviser;

  useEffect(() => {
    // 1. Wait for Auth to load
    if (authLoading) return;

    // 2. Not logged in? -> Go to Login with return URL
    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(pathname);
      router.push(`/login?redirect=${returnUrl}`); 
      return;
    }

    // 3. Redirect if no access
    if (!hasAccess) {
      // Kick them out to analytics (or home /)
      router.push('/analytics'); 
    }

    // Optional: Strict Redirect for Advisors
    // If you want to prevent Advisors from seeing Documents/Theme globally:
    /*
    if (user?.is_adviser && !user?.is_admin && !user?.is_super_admin) {
        const protectedRoutes = ['/admin/documents', '/admin/theme', '/admin/requests'];
        if (protectedRoutes.some(route => pathname.startsWith(route))) {
            router.push('/admin/users'); // Force them to their allowed area
        }
    }
    */

  }, [isAuthenticated, hasAccess, authLoading, router, pathname, user]);

  
  // 4. Loading State (Prevents content flash)
  if (authLoading || !isAuthenticated || !hasAccess) {
    return (
      <main className="container mx-auto p-20 text-center text-slate-400">
        <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="h-4 w-32 bg-slate-200 rounded"></div>
            <span className="text-sm">Verifying permissions...</span>
        </div>
      </main>
    );
  }

  // 5. Render Content
  return (
    <main 
      className="container mx-auto p-6 md:p-10 min-h-screen animate-fade-in"
      style={{ backgroundColor: 'var(--background-color)' }}
    >
        <div className="max-w-7xl mx-auto">
            {children}
        </div>
    </main>
  );
}
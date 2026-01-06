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

    // 3. Define Allowed Roles
    // robust check: handles case sensitivity and different naming conventions
    const userRole = user?.role || '';
    const isSuperAdmin = user?.is_super_admin || userRole === 'Super Admin';
    const isAdmin = user?.is_admin || userRole === 'Admin' || isSuperAdmin;
    const isAdvisor = userRole === 'Advisor' || userRole === 'Adviser';

    // 4. Check Permission
    if (!isAdmin && !isAdvisor) {
      // If they are a Student or regular User, kick them out
      // Redirect to Analytics (if you created it) or Home
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

  // 5. Render Content (Only if allowed)
  // We repeat the check here to prevent "flashing" the content before redirect
  const userRole = user?.role || '';
  const isAllowed = user?.is_admin || user?.is_super_admin || 
                    ['Super Admin', 'Admin', 'Advisor', 'Adviser'].includes(userRole);

  if (!isAllowed) return null;

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
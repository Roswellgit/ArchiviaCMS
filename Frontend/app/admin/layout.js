'use client';

import { useAuth } from '../../context/AuthContext'; 
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }) {
  const { user, isAuthenticated, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Allow access if they are Admin OR Advisor
    // We check if the role is 'Advisor' (or whatever your specific string is)
    const isAuthorized = user?.is_admin || user?.role === 'Advisor';

    if (!authLoading && (!isAuthenticated || !isAuthorized)) {
      router.push('/login'); 
    }
  }, [isAuthenticated, user, authLoading, router]);

  // Update loading check too
  const isAuthorized = user?.is_admin || user?.role === 'Advisor';

  if (authLoading || !isAuthenticated || !isAuthorized) {
    return (
      <main className="container mx-auto p-20 text-center text-slate-400">
        <div className="animate-pulse">Loading admin resources...</div>
      </main>
    );
  }

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
'use client';

import { useAuth } from '../../context/AuthContext'; 
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }) {
  const { user, isAuthenticated, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;

    // 1. Not logged in? -> Login
    if (!isAuthenticated) {
      router.push('/login'); 
      return;
    }

    // 2. Define who is allowed in the Management Area
    // STRICT: Only Super Admin, Admin, and Advisor
    const allowedRoles = ['Super Admin', 'Admin', 'Advisor'];
    const userRole = user?.role || 'User';

    if (!allowedRoles.includes(userRole)) {
      // If a student (or normal user) tries to access Admin, send them to Analytics
      router.push('/analytics'); 
    }
  }, [isAuthenticated, user, authLoading, router]);

  
  if (authLoading || !isAuthenticated) {
    return (
      <main className="container mx-auto p-20 text-center text-slate-400">
        <div className="animate-pulse">Loading admin resources...</div>
      </main>
    );
  }

  // Double check render block logic
  const allowedRoles = ['Super Admin', 'Admin', 'Advisor'];
  if (!allowedRoles.includes(user?.role)) {
      return null; // Don't render content while redirecting
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
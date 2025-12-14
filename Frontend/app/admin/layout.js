'use client';

// Note: usage of '../../' to go up two levels (admin -> app -> Frontend)
import { useAuth } from '../../context/AuthContext'; 
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }) {
  const { user, isAuthenticated, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth is done loading and user is not authed or is not an admin
    if (!authLoading && (!isAuthenticated || !user?.is_admin)) {
      router.push('/login'); // Redirect to login
    }
  }, [isAuthenticated, user, authLoading, router]);

  // Show loading state or nothing while checking
  if (authLoading || !isAuthenticated || !user?.is_admin) {
    return (
      <main className="container mx-auto p-20 text-center text-slate-400">
        <div className="animate-pulse">Loading admin resources...</div>
      </main>
    );
  }

  // If user is an admin, render the admin content
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
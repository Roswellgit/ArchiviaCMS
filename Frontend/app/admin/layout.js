'use client';

import { useAuth } from '../../context/AuthContext'; 
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }) {
  const { user, isAuthenticated, authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasAccess = user?.is_admin || user?.is_super_admin || user?.is_adviser;

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(pathname);
      router.push(`/login?redirect=${returnUrl}`); 
      return;
    }
    if (!hasAccess) {
      router.push('/analytics'); 
    }

  }, [isAuthenticated, hasAccess, authLoading, router, pathname, user]);
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
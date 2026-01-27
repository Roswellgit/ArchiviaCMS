'use client';

import { useEffect, useState } from 'react';
import { getAdminAnalytics } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import AnalyticsDashboard from '../../components/AnalyticsDashboard';

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated, authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    const fetchStats = async () => {
      try {
        const res = await getAdminAnalytics();
        setStats(res.data);
      } catch (err) {
        console.error("Failed to load analytics", err);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
        fetchStats();
    }
  }, [isAuthenticated, authLoading]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-slate-400 font-medium">Loading insights...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background-color)]">
      <div className="container mx-auto px-6 py-10 max-w-7xl">
        
        {/* Header */}
        <div className="mb-8 border-b border-gray-200 pb-6">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Research Analytics
          </h1>
          <p className="text-slate-500 mt-2">
            Overview of ArchiviaCMS research data and trends.
          </p>
        </div>

        {/* Reusable Component: It handles showing/hiding data based on user role automatically */}
        <AnalyticsDashboard stats={stats} role={user?.role} />
        
      </div>
    </main>
  );
}
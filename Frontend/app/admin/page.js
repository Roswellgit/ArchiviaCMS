'use client';

import { useEffect, useState } from 'react';
import { getAdminAnalytics } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import AnalyticsDashboard from '../../components/AnalyticsDashboard'; // Make sure this file exists from previous step

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getAdminAnalytics();
        setStats(res.data);
      } catch (err) {
        console.error("Failed to load stats");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="p-20 text-center text-slate-400">Loading dashboard data...</div>;

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-gray-200 pb-6">
        <div>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Overview</h2>
            <p className="text-slate-500 mt-2 font-medium">Welcome back, {user?.firstName}. Here is what's happening today.</p>
        </div>
      </div>

      {/* --- SECTION 1: Key Metrics (Admins Only) --- */}
      {user?.role !== 'Student' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Users */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all group">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Users</p>
                        <h3 className="text-4xl font-extrabold text-slate-900 mt-2 group-hover:text-indigo-600 transition-colors">{stats?.totalUsers || 0}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center text-sm text-green-600 font-bold">
                    <span className="bg-green-100 px-1.5 py-0.5 rounded text-xs mr-2">LIVE</span>
                    {stats?.activeUsers} Active Now
                </div>
            </div>

            {/* Total Documents */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all group">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Documents</p>
                        <h3 className="text-4xl font-extrabold text-slate-900 mt-2 group-hover:text-indigo-600 transition-colors">{stats?.totalDocuments || 0}</h3>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    </div>
                </div>
                <p className="mt-4 pt-4 border-t border-slate-50 text-xs text-slate-400 font-medium">Indexed across all categories</p>
            </div>

            {/* Pending Requests */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all group">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending</p>
                        <h3 className="text-4xl font-extrabold text-slate-900 mt-2 group-hover:text-orange-500 transition-colors">{stats?.pendingRequests || 0}</h3>
                    </div>
                    <div className="p-3 bg-orange-50 text-orange-500 rounded-xl group-hover:bg-orange-100 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                </div>
                <p className="mt-4 pt-4 border-t border-slate-50 text-xs text-orange-600 font-bold">Action required immediately</p>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 hover:shadow-lg transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <svg className="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>
                </div>
                <div className="relative z-10">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Actions</p>
                    <div className="mt-4 flex flex-col gap-2">
                        <Link href="/admin/documents" className="block w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-500 transition text-center">
                            Review Documents
                        </Link>
                        <Link href="/admin/users" className="block w-full py-2 bg-slate-700 text-slate-200 rounded-lg text-sm font-bold hover:bg-slate-600 transition text-center">
                            Manage Users
                        </Link>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- SECTION 2: Advanced Visualizations (The New Stuff) --- */}
      {/* This component handles the Bar Charts for Strand, Year Level, etc. */}
      {/* We pass the stats object which now contains 'documentsByStrand', etc. */}
      <AnalyticsDashboard stats={stats} role={user?.role} />

    </div>
  );
}
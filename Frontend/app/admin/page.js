'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import AnalyticsDashboard from '../../components/AnalyticsDashboard';

// API Imports
import { 
  getAdminAnalytics, 
  getPendingDocuments, approveDocument, rejectDocument,
  getDocArchiveRequests, approveDocArchive, rejectDocArchive,
  getUserArchiveRequests, approveUserArchive, rejectUserArchive
} from '../../services/apiService';

// Helper Component for Tables to reduce code repetition
const RequestTable = ({ title, items, type, onAction, emptyMsg, colorClass, icon }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
    <div className={`px-6 py-4 border-b border-slate-50 ${colorClass} bg-opacity-5 flex justify-between items-center`}>
       <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h3 className={`font-bold text-lg ${colorClass}`}>{title}</h3>
       </div>
       <span className={`px-2 py-1 rounded text-xs font-bold bg-white border border-slate-100 shadow-sm ${colorClass}`}>
          {items.length} Pending
       </span>
    </div>
    
    <div className="overflow-y-auto max-h-[300px] flex-1">
      <table className="w-full text-left text-sm">
        <tbody className="divide-y divide-slate-50">
          {items.length === 0 ? (
            <tr className="p-8 text-center text-slate-400 block w-full">
              <td className="py-8 italic">{emptyMsg}</td>
            </tr>
          ) : (
            items.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                <td className="p-4 align-top">
                   <p className="font-bold text-slate-700 block mb-1">
                      {item.title || `${item.first_name} ${item.last_name}`}
                   </p>
                   {/* Show Author for docs, Reason for archives */}
                   {item.author_name && <p className="text-xs text-slate-400">By: {item.author_name}</p>}
                   {item.archive_reason && <p className="text-xs text-slate-500 italic bg-slate-50 p-1 rounded mt-1 border border-slate-100 inline-block">"{item.archive_reason}"</p>}
                </td>
                <td className="p-4 text-right align-top space-x-2 w-[160px]">
                   <button 
                      onClick={() => onAction(type, item.id, 'approve')} 
                      className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"
                   >
                     Approve
                   </button>
                   <button 
                      onClick={() => onAction(type, item.id, 'reject')} 
                      className="px-3 py-1.5 border border-slate-200 text-slate-500 text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                   >
                     Reject
                   </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [stats, setStats] = useState(null);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [docArchives, setDocArchives] = useState([]);
  const [userArchives, setUserArchives] = useState([]);

  // Permission Helper
  const isPrivileged = user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Advisor';

  // --- FETCH DATA ---
  const fetchAllData = async () => {
    try {
      // 1. Always fetch Analytics
      const statsRes = await getAdminAnalytics();
      setStats(statsRes.data);

      // 2. Only fetch Action Items if Admin/Advisor
      if (isPrivileged) {
        const [uploadsRes, docArcRes, userArcRes] = await Promise.all([
            getPendingDocuments(),
            getDocArchiveRequests(),
            getUserArchiveRequests()
        ]);
        setPendingUploads(uploadsRes.data || uploadsRes);
        setDocArchives(docArcRes.data || docArcRes);
        setUserArchives(userArcRes.data || userArcRes);
      }
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchAllData();
  }, [user, isPrivileged]);

  // --- HANDLERS ---
  const handleAction = async (type, id, action) => {
      const confirmMsg = `Are you sure you want to ${action} this request?`;
      if (!window.confirm(confirmMsg)) return;

      try {
          if (type === 'upload') {
              action === 'approve' ? await approveDocument(id) : await rejectDocument(id);
          } 
          else if (type === 'docArchive') {
              action === 'approve' ? await approveDocArchive(id) : await rejectDocArchive(id);
          }
          else if (type === 'userArchive') {
              action === 'approve' ? await approveUserArchive(id) : await rejectUserArchive(id);
          }
          
          toast.success("Success!");
          fetchAllData(); 
      } catch (err) {
          toast.error("Action failed");
          console.error(err);
      }
  };

  if (loading) return <div className="p-20 text-center text-slate-400">Loading dashboard...</div>;

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      
      {/* HEADER */}
      <div className="border-b border-gray-200 pb-6">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
             {isPrivileged ? 'Admin Dashboard' : 'Analytics Hub'}
        </h2>
        <p className="text-slate-500 mt-1">Welcome back, {user?.firstName}.</p>
      </div>

      {/* --- SECTION 1: STATS CARDS (Admins Only) --- */}
      {isPrivileged && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Users</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{stats?.totalUsers || 0}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Documents</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{stats?.totalDocuments || 0}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Tasks</p>
                <h3 className="text-3xl font-extrabold text-orange-600 mt-2">
                    {pendingUploads.length + docArchives.length + userArchives.length}
                </h3>
            </div>
            <div className="bg-slate-900 p-6 rounded-2xl shadow-sm text-white flex flex-col justify-center hover:bg-slate-800 transition-colors cursor-pointer group">
                <Link href="/admin/users" className="flex items-center justify-between">
                   <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Action</p>
                      <h3 className="text-xl font-bold mt-1">Manage Users &rarr;</h3>
                   </div>
                </Link>
            </div>
        </div>
      )}

      {/* --- SECTION 2: THREE SEPARATE PENDING MODULES --- */}
      {isPrivileged && (
          <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-800">Pending Requests</h3>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  
                  {/* 1. DOCUMENT APPROVALS (Takes full width on large screens if needed, or half) */}
                  <div className="xl:col-span-2">
                     <RequestTable 
                        title="Document Approvals" 
                        items={pendingUploads} 
                        type="upload" 
                        onAction={handleAction} 
                        emptyMsg="No new documents to review."
                        colorClass="text-indigo-600"
                        icon="📄"
                     />
                  </div>

                  {/* 2. DOCUMENT ARCHIVE REQUESTS */}
                  <RequestTable 
                      title="Doc Archive Requests" 
                      items={docArchives} 
                      type="docArchive" 
                      onAction={handleAction} 
                      emptyMsg="No document archive requests."
                      colorClass="text-orange-600"
                      icon="📦"
                  />

                  {/* 3. USER ARCHIVE REQUESTS */}
                  <RequestTable 
                      title="User Archive Requests" 
                      items={userArchives} 
                      type="userArchive" 
                      onAction={handleAction} 
                      emptyMsg="No user archive requests."
                      colorClass="text-red-600"
                      icon="👤"
                  />
              </div>
          </div>
      )}

      {/* --- SECTION 3: ANALYTICS --- */}
      <div className="pt-6 border-t border-slate-100">
         <h3 className="text-xl font-bold text-slate-800 mb-6">Research Analytics</h3>
         <AnalyticsDashboard stats={stats} role={user?.role} />
      </div>

    </div>
  );
}